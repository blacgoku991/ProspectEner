import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Ne pas utiliser env() ici : `prisma generate` (postinstall) doit fonctionner sans base configurée.
    url: process.env["DATABASE_URL"] ?? "",
  },
});
