'use client';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  warningMessage?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  warningMessage,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
        
        <p className="text-gray-700 mb-4">{message}</p>
        
        {warningMessage && (
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
            <p className="text-sm">{warningMessage}</p>
          </div>
        )}
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}
