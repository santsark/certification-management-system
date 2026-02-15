'use client';

import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { CertificationFormData } from '@/lib/validations/certification';

interface QuestionItemProps {
    index: number;
    register: UseFormRegister<CertificationFormData>;
    watch: UseFormWatch<CertificationFormData>;
    setValue: UseFormSetValue<CertificationFormData>;
    onDelete: () => void;
    dragHandleProps?: any;
}

export function QuestionItem({
    index,
    register,
    watch,
    setValue,
    onDelete,
    dragHandleProps,
}: QuestionItemProps) {
    const questionType = watch(`questions.${index}.type`);
    const options = watch(`questions.${index}.options`) || [];

    const addOption = () => {
        const currentOptions = options || [];
        setValue(`questions.${index}.options`, [...currentOptions, '']);
    };

    const removeOption = (optionIndex: number) => {
        const currentOptions = options || [];
        setValue(
            `questions.${index}.options`,
            currentOptions.filter((_, i) => i !== optionIndex)
        );
    };

    const updateOption = (optionIndex: number, value: string) => {
        const currentOptions = options || [];
        const newOptions = [...currentOptions];
        newOptions[optionIndex] = value;
        setValue(`questions.${index}.options`, newOptions);
    };

    return (
        <div className="border rounded-lg p-4 bg-card space-y-4">
            <div className="flex items-start gap-2">
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing pt-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                        <Badge variant="secondary">Question {index + 1}</Badge>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`question-${index}-text`}>Question Text *</Label>
                        <Textarea
                            id={`question-${index}-text`}
                            {...register(`questions.${index}.question`)}
                            placeholder="Enter your question..."
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`question-${index}-type`}>Question Type *</Label>
                        <Select
                            value={questionType}
                            onValueChange={(value) => {
                                setValue(`questions.${index}.type`, value as any);
                                // Clear type-specific fields when type changes
                                if (value !== 'dropdown' && value !== 'multiple_choice') {
                                    setValue(`questions.${index}.options`, undefined);
                                }
                                if (value !== 'yes_no') {
                                    setValue(`questions.${index}.allow_comments`, undefined);
                                }
                            }}
                        >
                            <SelectTrigger id={`question-${index}-type`}>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yes_no">Yes/No</SelectItem>
                                <SelectItem value="dropdown">Dropdown</SelectItem>
                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {questionType === 'yes_no' && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`question-${index}-comments`}
                                checked={watch(`questions.${index}.allow_comments`) || false}
                                onCheckedChange={(checked: boolean) =>
                                    setValue(`questions.${index}.allow_comments`, checked as boolean)
                                }
                            />
                            <Label htmlFor={`question-${index}-comments`} className="cursor-pointer">
                                Allow comments
                            </Label>
                        </div>
                    )}

                    {(questionType === 'dropdown' || questionType === 'multiple_choice') && (
                        <div className="space-y-2">
                            <Label>Options (minimum 2) *</Label>
                            <div className="space-y-2">
                                {options?.map((option: string, optIndex: number) => (
                                    <div key={optIndex} className="flex gap-2">
                                        <Input
                                            value={option}
                                            onChange={(e) => updateOption(optIndex, e.target.value)}
                                            placeholder={`Option ${optIndex + 1}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => removeOption(optIndex)}
                                            disabled={options.length <= 2}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addOption}
                                    className="w-full"
                                >
                                    Add Option
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`question-${index}-required`}
                            checked={watch(`questions.${index}.required`) || false}
                            onCheckedChange={(checked: boolean) =>
                                setValue(`questions.${index}.required`, checked as boolean)
                            }
                        />
                        <Label htmlFor={`question-${index}-required`} className="cursor-pointer">
                            Required question
                        </Label>
                    </div>
                </div>
            </div>
        </div>
    );
}
