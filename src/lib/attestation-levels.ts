import { db } from '@/db';
import { certificationAssignments, attestationResponses, users } from '@/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

export type AttestationLevel = 1 | 2;

export interface AssignmentGroup {
    groupId: string; // uuid — same as the L2 attester's assignment id or a specific group id
    l1Attesters: string[]; // array of user ids
    l2Attester: string; // single user id
}

interface UnlockResult {
    shouldUnlockL2: boolean;
    l2AttesterId?: string;
    groupId?: string;
}

/**
 * Checks if the submission by an attester unlocks the next level (L2) for their group.
 * @param certificationId The ID of the certification
 * @param submittedAttesterId The ID of the attester who just submitted
 * @returns Object indicating if L2 should be unlocked and the details
 */
export async function checkLevelUnlock(
    certificationId: string,
    submittedAttesterId: string
): Promise<UnlockResult> {
    // 1. Find the submitting attester's assignment row to get their level_group_id
    const [assignment] = await db
        .select({
            level: certificationAssignments.level,
            levelGroupId: certificationAssignments.levelGroupId,
        })
        .from(certificationAssignments)
        .where(
            and(
                eq(certificationAssignments.certificationId, certificationId),
                eq(certificationAssignments.attesterId, submittedAttesterId)
            )
        )
        .limit(1);

    if (!assignment) {
        console.error(`Assignment not found for attester ${submittedAttesterId} on cert ${certificationId}`);
        return { shouldUnlockL2: false };
    }

    // 2. If level = 2 or level_group_id is null → return { shouldUnlockL2: false }
    if (assignment.level === 2 || !assignment.levelGroupId) {
        return { shouldUnlockL2: false };
    }

    const groupId = assignment.levelGroupId;

    // 3. Count total L1 assignments WHERE level_group_id = groupId
    const [totalL1Result] = await db
        .select({ count: count() })
        .from(certificationAssignments)
        .where(
            and(
                eq(certificationAssignments.certificationId, certificationId),
                eq(certificationAssignments.levelGroupId, groupId as string), // Cast as string since we checked null
                eq(certificationAssignments.level, 1)
            )
        );

    const totalL1Count = totalL1Result?.count || 0;

    // 4. Count submitted L1 responses WHERE level_group_id = groupId
    // We need to join attestation_responses with certification_assignments
    // to filter by level_group_id AND status='submitted'
    const [submittedL1Result] = await db
        .select({ count: count() })
        .from(attestationResponses)
        .innerJoin(
            certificationAssignments,
            and(
                eq(attestationResponses.certificationId, certificationAssignments.certificationId),
                eq(attestationResponses.attesterId, certificationAssignments.attesterId)
            )
        )
        .where(
            and(
                eq(attestationResponses.certificationId, certificationId),
                eq(attestationResponses.status, 'submitted'),
                eq(certificationAssignments.levelGroupId, groupId as string),
                eq(certificationAssignments.level, 1)
            )
        );

    const submittedL1Count = submittedL1Result?.count || 0;

    console.log(`Level unlock check for group ${groupId}: ${submittedL1Count}/${totalL1Count} L1s submitted`);

    // 5. If submitted count === total count:
    if (totalL1Count > 0 && submittedL1Count === totalL1Count) {
        // Find L2 attester WHERE level=2 AND level_group_id = groupId
        const [l2Assignment] = await db
            .select({
                attesterId: certificationAssignments.attesterId,
            })
            .from(certificationAssignments)
            .where(
                and(
                    eq(certificationAssignments.certificationId, certificationId),
                    eq(certificationAssignments.levelGroupId, groupId as string),
                    eq(certificationAssignments.level, 2)
                )
            )
            .limit(1);

        if (l2Assignment) {
            return {
                shouldUnlockL2: true,
                l2AttesterId: l2Assignment.attesterId,
                groupId: groupId as string,
            };
        }
    }

    return { shouldUnlockL2: false };
}
