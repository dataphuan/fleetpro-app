import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/formatters";

export interface SummaryCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    color?: string; // e.g., "text-blue-600"
    bgColor?: string; // e.g., "bg-blue-50"
    description?: string;
    isCurrency?: boolean;
}

export function ReportSummaryCards({ cards }: { cards: SummaryCardProps[] }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => (
                <Card key={index} className={`${card.bgColor || 'bg-card'} border-none shadow-sm`}>
                    <CardContent className="p-6 flex items-center justify-between space-x-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                {card.title}
                            </p>
                            <div className="flex items-baseline gap-1">
                                <h3 className={`text-2xl font-bold ${card.color || ''}`}>
                                    {typeof card.value === 'number'
                                        ? (card.isCurrency ? formatCurrency(card.value) : formatNumber(card.value))
                                        : card.value}
                                </h3>
                            </div>
                            {card.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {card.description}
                                </p>
                            )}
                        </div>
                        {card.icon && (
                            <div className={`p-3 rounded-full ${card.bgColor ? 'bg-white/50' : 'bg-muted'} ${card.color}`}>
                                <card.icon className="h-6 w-6" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
