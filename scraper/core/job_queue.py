from typing import Any

from psycopg2.extras import Json, RealDictCursor

from config import settings
from core import db
from core.models import ChapterData, DuplicateNovelError, NovelData
from core.utils import count_words, download_cover


def claim_next_job() -> dict[str, Any] | None:
    sql = """
        WITH next_job AS (
          SELECT id
          FROM scrape_jobs
          WHERE status = 'pending'
            AND type IN ('novel_ingestion', 'chapter_fetch')
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE scrape_jobs sj
        SET status = 'running',
            started_at = NOW(),
            error_type = NULL,
            error_message = NULL,
            progress_percent = GREATEST(progress_percent, 5),
            progress_message = 'Starting import'
        FROM next_job
        WHERE sj.id = next_job.id
        RETURNING sj.*
    """

    with db.transaction() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            row = cur.fetchone()
            return dict(row) if row else None


def update_progress(
    job_id: str,
    percent: int,
    message: str,
    current: int | None = None,
    total: int | None = None,
) -> None:
    db.execute(
        """
        UPDATE scrape_jobs
        SET progress_percent = %s,
            progress_message = %s,
            progress_current = %s,
            progress_total = %s
        WHERE id = %s
          AND status = 'running'
        """,
        (max(0, min(100, int(percent))), message[:255], current, total, job_id),
    )


def mark_complete(job_id: str, novel_id: str, chapter_count: int) -> None:
    db.execute(
        """
        UPDATE scrape_jobs
        SET status = 'completed',
            novel_id = %s,
            completed_at = NOW(),
            result = %s,
            error_type = NULL,
            error_message = NULL,
            progress_percent = 100,
            progress_message = 'Import complete',
            progress_current = %s,
            progress_total = %s
        WHERE id = %s
        """,
        (
            novel_id,
            Json({"novel_id": novel_id, "chapter_count": chapter_count}),
            chapter_count,
            chapter_count,
            job_id,
        ),
    )


def mark_chapter_complete(job_id: str, chapter_id: str, word_count: int) -> None:
    db.execute(
        """
        UPDATE scrape_jobs
        SET status = 'completed',
            chapter_id = %s,
            completed_at = NOW(),
            result = %s,
            error_type = NULL,
            error_message = NULL,
            progress_percent = 100,
            progress_message = 'Chapter complete'
        WHERE id = %s
        """,
        (chapter_id, Json({"chapter_id": chapter_id, "word_count": word_count}), job_id),
    )


def mark_failed(job_id: str, error_type: str, error_message: str, retry: bool) -> None:
    rows = db.query(
        "SELECT retry_count, max_retries FROM scrape_jobs WHERE id = %s",
        (job_id,),
    )
    if not rows:
        return

    retry_count = int(rows[0]["retry_count"])
    max_retries = int(rows[0]["max_retries"])
    should_retry = retry and retry_count < max_retries

    if should_retry:
        db.execute(
            """
            UPDATE scrape_jobs
            SET status = 'pending',
                retry_count = retry_count + 1,
                error_type = %s,
                error_message = %s,
                progress_percent = 0,
                progress_message = 'Retrying import',
                progress_current = NULL,
                progress_total = NULL
            WHERE id = %s
            """,
            (error_type, error_message[:1000], job_id),
        )
        return

    db.execute(
        """
        UPDATE scrape_jobs
        SET status = 'failed',
            completed_at = NOW(),
            error_type = %s,
            error_message = %s,
            result = %s,
            progress_percent = 100,
            progress_message = 'Import failed'
        WHERE id = %s
        """,
        (error_type, error_message[:1000], Json({"error": error_message[:1000]}), job_id),
    )


def mark_chapter_fetch_failed(chapter_id: str | None, error_type: str, error_message: str) -> None:
    if not chapter_id:
        return

    db.execute(
        """
        UPDATE chapters
        SET fetch_failed = true,
            fetch_error = %s,
            fetch_error_msg = %s
        WHERE id = %s
        """,
        (error_type, error_message[:1000], chapter_id),
    )


def store_chapter_content(chapter_id: str, content: str) -> int:
    word_count = count_words(content)

    with db.transaction() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO chapter_contents (chapter_id, content, word_count)
                VALUES (%s, %s, %s)
                ON CONFLICT (chapter_id)
                DO UPDATE SET
                  content = EXCLUDED.content,
                  word_count = EXCLUDED.word_count,
                  updated_at = NOW()
                """,
                (chapter_id, content, word_count),
            )
            cur.execute(
                """
                UPDATE chapters
                SET is_fetched = true,
                    fetched_at = NOW(),
                    fetch_failed = false,
                    fetch_error = NULL,
                    fetch_error_msg = NULL
                WHERE id = %s
                """,
                (chapter_id,),
            )

    return word_count


def ingest_novel(novel_data: NovelData, chapters: list[ChapterData], job_id: str, user_id: str) -> str:
    with db.transaction() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM novels WHERE source_url = %s LIMIT 1", (novel_data.source_url,))
            if cur.fetchone():
                raise DuplicateNovelError("This novel has already been imported.")

            cur.execute(
                """
                INSERT INTO novels (
                  source_site, source_url, title, author, description,
                  cover_url_orig, tags, total_chapters, last_scraped_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id
                """,
                (
                    novel_data.source_site,
                    novel_data.source_url,
                    novel_data.title,
                    novel_data.author,
                    novel_data.description,
                    novel_data.cover_url,
                    novel_data.tags,
                    len(chapters),
                ),
            )
            novel_id = str(cur.fetchone()["id"])

            cover_path = download_cover(novel_data.cover_url, novel_id, settings.covers_dir)
            if cover_path:
                cur.execute("UPDATE novels SET cover_url = %s WHERE id = %s", (cover_path, novel_id))

            chapter_ids: list[str] = []
            for chapter in chapters:
                has_content = chapter.content is not None
                cur.execute(
                    """
                    INSERT INTO chapters (
                      novel_id, chapter_number, title, source_url,
                      is_fetched, is_new, discovered_at, fetched_at
                    )
                    VALUES (%s, %s, %s, %s, %s, false, NOW(), CASE WHEN %s THEN NOW() ELSE NULL END)
                    RETURNING id
                    """,
                    (
                        novel_id,
                        chapter.chapter_number,
                        chapter.title,
                        chapter.source_url,
                        has_content,
                        has_content,
                    ),
                )
                chapter_id = str(cur.fetchone()["id"])
                chapter_ids.append(chapter_id)

                if chapter.content is not None:
                    cur.execute(
                        """
                        INSERT INTO chapter_contents (chapter_id, content, word_count)
                        VALUES (%s, %s, %s)
                        """,
                        (chapter_id, chapter.content, count_words(chapter.content)),
                    )

            cur.execute(
                """
                INSERT INTO library_entries (user_id, novel_id, status)
                VALUES (%s, %s, 'following')
                """,
                (user_id, novel_id),
            )

            for chapter_id in chapter_ids:
                cur.execute(
                    """
                    INSERT INTO user_new_chapters (user_id, chapter_id, novel_id, seen_at)
                    VALUES (%s, %s, %s, NULL)
                    ON CONFLICT (user_id, chapter_id) DO NOTHING
                    """,
                    (user_id, chapter_id, novel_id),
                )

            cur.execute("UPDATE novels SET total_chapters = %s WHERE id = %s", (len(chapters), novel_id))
            cur.execute("UPDATE scrape_jobs SET novel_id = %s WHERE id = %s", (novel_id, job_id))
            return novel_id
