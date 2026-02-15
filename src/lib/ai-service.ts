import { GoogleGenAI } from '@google/genai';

export interface GeneratedQuestion {
    question: string;
    type: 'yes_no' | 'dropdown' | 'multiple_choice' | 'text' | 'date';
    options?: string[];
    allow_comments?: boolean;
    required: boolean;
}

const client = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

export async function generateQuestionsFromRequirement(
    requirement: string
): Promise<GeneratedQuestion[]> {
    if (!client) {
        throw new Error('Gemini API key not configured');
    }

    const prompt = `You are a certification expert. Based on this requirement, generate 3-5 certification questions that attesters should answer.

Requirement: ${requirement}

Return ONLY a valid JSON array with this exact structure (no markdown, no additional text):
[{
  "question": "question text",
  "type": "yes_no" | "dropdown" | "multiple_choice" | "text" | "date",
  "options": ["option1", "option2"],
  "allow_comments": true,
  "required": true
}]

Rules:
1. type must be exactly one of: "yes_no", "dropdown", "multiple_choice", "text", "date"
2. options is ONLY included for "dropdown" or "multiple_choice" types (minimum 2 options)
3. allow_comments is ONLY included for "yes_no" type
4. required should be true for critical questions
5. Generate 3-5 questions maximum
6. Make questions clear, specific, and relevant

Return ONLY the JSON array, nothing else.`;

    try {
        const result = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = result.text;

        if (!text) {
            throw new Error('No text content in AI response');
        }

        // Clean up the response - remove markdown code blocks if present
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }

        // Parse the JSON
        const questions = JSON.parse(jsonText);

        // Validate the structure
        if (!Array.isArray(questions)) {
            throw new Error('AI response is not an array');
        }

        // Validate and clean each question
        const validatedQuestions: GeneratedQuestion[] = questions.map((q: any) => {
            if (!q.question || typeof q.question !== 'string') {
                throw new Error('Invalid question structure: missing or invalid question text');
            }

            const validTypes = ['yes_no', 'dropdown', 'multiple_choice', 'text', 'date'];
            if (!validTypes.includes(q.type)) {
                throw new Error(`Invalid question type: ${q.type}`);
            }

            // Build validated question
            const validated: GeneratedQuestion = {
                question: q.question,
                type: q.type,
                required: q.required === true,
            };

            // Add type-specific fields
            if (q.type === 'yes_no' && q.allow_comments !== undefined) {
                validated.allow_comments = q.allow_comments === true;
            }

            if ((q.type === 'dropdown' || q.type === 'multiple_choice') && Array.isArray(q.options)) {
                if (q.options.length < 2) {
                    throw new Error('Dropdown/multiple choice must have at least 2 options');
                }
                validated.options = q.options;
            }

            return validated;
        });

        // Limit to 5 questions
        return validatedQuestions.slice(0, 5);
    } catch (error: any) {
        console.error('AI question generation error:', error);
        if (error?.message?.includes('API key')) {
            throw new Error('Invalid Gemini API key');
        }
        if (error instanceof SyntaxError) {
            throw new Error('Failed to parse AI response as JSON');
        }
        throw new Error(`AI generation failed: ${error.message}`);
    }
}
