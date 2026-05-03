import "express-session";
import type { AdminRole } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
    customerId?: number;
    adminUserId?: number;
    adminUsername?: string;
    adminRole?: AdminRole;
  }
}
