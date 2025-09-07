'use client'

interface DownloadBtnProps{
    text: string;
    loadingText?: string;
    isLoading?: boolean;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
}

export function DownloadBtn({
  text,
  loadingText,
  isLoading = false,
  disabled = false,
  onClick,
  className = "",
}: DownloadBtnProps){
    return(
        <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-black shadow-md 
                    hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 
                    focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? loadingText || text : text}
      </button>
    )
}