import { NextRequest, NextResponse } from 'next/server';
import { generateQuestionsFromRequirement } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { requirement } = body;

        if (!requirement || typeof requirement !== 'string' || requirement.trim().length === 0) {
            return NextResponse.json(
                { error: 'Requirement text is required' },
                { status: 400 }
            );
        }

        if (requirement.length > 2000) {
            return NextResponse.json(
                { error: 'Requirement text is too long (max 2000 characters)' },
                { status: 400 }
            );
        }

        const questions = await generateQuestionsFromRequirement(requirement);

        return NextResponse.json({ questions });
    } catch (error: any) {
        console.error('Generate questions error:', error);

        if (error.message?.includes('API key')) {
            return NextResponse.json(
                { error: 'AI service not configured. Please contact administrator.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to generate questions' },
            { status: 500 }
        );
    }
}
