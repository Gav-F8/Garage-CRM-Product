interface CreateButtonProps {
  onClick: () => void;
  buttonText: string;
  className?: string;
}

export function CreateButton({ onClick, buttonText, className = "" }: CreateButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`h-10 px-4 rounded-lg bg-[#37352F] hover:bg-[#474540] text-white text-sm font-medium shadow-sm transition-all ${className}`}
    >
      { buttonText }
    </button>
  );
}
