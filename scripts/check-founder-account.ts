import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function main() {
  const email = "d9ckoblack@gmail.com";
  const rows = await db.execute(sql`
    SELECT u.id, u.email, u.first_name, u.last_name, p.id AS profile_id, p.username, p.role, p.creator_application_status
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE lower(u.email) = lower(${email})
  `);
  console.log("founder user:", JSON.stringify(rows.rows, null, 2));

  const admins = await db.execute(sql`
    SELECT u.email, p.username, p.role
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.role IN ('admin', 'founder')
    ORDER BY p.id
  `);
  console.log("admin profiles:", JSON.stringify(admins.rows, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
