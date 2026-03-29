import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReactNode } from "react";

interface RowDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
}

export function RowDetailDrawer({
    isOpen,
    onClose,
    title,
    description,
    children,
}: RowDetailDrawerProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] md:w-[700px] lg:w-[800px] p-0 flex flex-col">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle>{title}</SheetTitle>
                    {description && <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>
                <ScrollArea className="flex-1 p-6">
                    {children}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
