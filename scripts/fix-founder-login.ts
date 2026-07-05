import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { parseFounderAdminEmails } from "../shared/constants";

/**
 * Repair founder login:
 * - Remove founder email wrongly attached to seed artist `min_soo`
 * - Drop empty orphan OAuth rows blocking re-login
 * - Promote known founder Google accounts to admin
 */
async function main() {
  const founderEmails = parseFounderAdminEmails(process.env.NEX_FOUNDER_ADMIN_EMAIL);
  console.log("Founder emails:", founderEmails.join(", "));

  const wrong = await db.execute(sql`
    SELECT u.id, u.email, p.username, p.role
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = 'artist_min_soo'
  `);
  console.log("Before min_soo fix:", (wrong.rows as unknown[])?.[0]);

  await db.execute(sql`
    UPDATE users
    SET email = 'min_soo@artist.local',
        first_name = 'Min Soo',
        updated_at = NOW()
    WHERE id = 'artist_min_soo'
      AND lower(coalesce(email, '')) = 'd9ckoblack@gmail.com'
  `);

  await db.execute(sql`
    DELETE FROM users u
    WHERE u.email IS NULL
      AND u.id ~ '^[0-9]+$'
      AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.sess::text LIKE '%' || u.id || '%')
  `);

  for (const email of founderEmails) {
    const updated = await db.execute(sql`
      UPDATE profiles p
      SET role = 'admin',
          creator_application_status = 'none'
      FROM users u
      WHERE u.id = p.user_id
        AND lower(coalesce(u.email, '')) = ${email}
        AND p.role IS DISTINCT FROM 'admin'
      RETURNING u.id, u.email, p.username, p.role
    `);
    for (const row of (updated.rows ?? []) as { id: string; email: string; username: string; role: string }[]) {
      console.log(`Promoted to admin: ${row.email} (@${row.username}, id=${row.id})`);
    }
  }

  const after = await db.execute(sql`
    SELECT u.id, u.email, p.username, p.role
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE lower(coalesce(u.email, '')) IN ('d9ckoblack@gmail.com', 'kidpink003@gmail.com')
       OR u.id = 'artist_min_soo'
    ORDER BY u.id
  `);
  console.log("After fix:", after.rows);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
