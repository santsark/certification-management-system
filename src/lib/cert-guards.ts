import { db } from "@/db";
import { certifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export class AppError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'AppError';
    }
}

export async function assertCertNotClosed(certId: string): Promise<void> {
    const [cert] = await db
        .select({ status: certifications.status })
        .from(certifications)
        .where(eq(certifications.id, certId))
        .limit(1);

    if (!cert) {
        throw new AppError(404, "Certification not found");
    }

    if (cert.status === "closed") {
        throw new AppError(400, "Cannot modify assignments on a closed certification");
    }
}
