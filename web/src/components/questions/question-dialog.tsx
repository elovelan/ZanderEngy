'use client';

import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuestionAnswerPanel } from '@/components/questions/question-answer-panel';

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
}

export function QuestionDialog({ open, onOpenChange, taskId }: QuestionDialogProps) {
  const { data: questions } = trpc.question.list.useQuery(
    { taskId, unanswered: true },
    { enabled: open },
  );

  const questionList = questions ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[60vw] max-w-4xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>Questions</DialogTitle>
        </DialogHeader>
        <QuestionAnswerPanel
          questions={questionList}
          onSubmitted={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
