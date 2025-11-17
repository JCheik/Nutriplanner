'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCode from "react-qr-code";

interface QRCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    qrValue: string;
    title: string;
    description: string;
}

export function QRCodeDialog({ isOpen, onClose, qrValue, title, description }: QRCodeDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                    <QRCode value={qrValue} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
