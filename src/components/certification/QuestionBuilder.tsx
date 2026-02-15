'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, UseFieldArrayRemove, Control, useFieldArray } from 'react-hook-form';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { QuestionItem } from './QuestionItem';
import type { CertificationFormData, CertificationQuestion } from '@/lib/validations/certification';
import { v4 as uuidv4 } from 'uuid';

interface QuestionBuilderProps {
    control: Control<CertificationFormData>;
    register: UseFormRegister<CertificationFormData>;
    watch: UseFormWatch<CertificationFormData>;
    setValue: UseFormSetValue<CertificationFormData>;
}

interface SortableQuestionProps {
    question: CertificationQuestion;
    index: number;
    register: UseFormRegister<CertificationFormData>;
    watch: UseFormWatch<CertificationFormData>;
    setValue: UseFormSetValue<CertificationFormData>;
    onDelete: () => void;
}

function SortableQuestion({ question, index, register, watch, setValue, onDelete }: SortableQuestionProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <QuestionItem
                index={index}
                register={register}
                watch={watch}
                setValue={setValue}
                onDelete={onDelete}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
}

export function QuestionBuilder({ control, register, watch, setValue }: QuestionBuilderProps) {
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'questions',
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((field) => field.id === active.id);
            const newIndex = fields.findIndex((field) => field.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                move(oldIndex, newIndex);
            }
        }
    };

    const addQuestion = () => {
        append({
            id: uuidv4(),
            question: '',
            type: 'yes_no',
            required: true,
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Questions</h3>
                    <p className="text-sm text-muted-foreground">
                        Add up to 5 questions for attesters to answer
                    </p>
                </div>
                <div className="text-sm text-muted-foreground">
                    {fields.length} / 5 questions
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <SortableQuestion
                                key={field.id}
                                question={field}
                                index={index}
                                register={register}
                                watch={watch}
                                setValue={setValue}
                                onDelete={() => remove(index)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {fields.length === 0 && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <p>No questions added yet</p>
                    <p className="text-sm">Click the button below to add your first question</p>
                </div>
            )}

            <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                disabled={fields.length >= 5}
                className="w-full"
            >
                <Plus className="mr-2 h-4 w-4" />
                Add Question {fields.length >= 5 && '(Maximum reached)'}
            </Button>
        </div>
    );
}
