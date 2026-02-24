// Notion-inspired theme constants
export const notionTheme = {
  colors: {
    bg: "bg-[#F7F7F5]",
    text: {
      primary: "text-[#37352F]",
      secondary: "text-[#787774]",
      placeholder: "text-[#9B9A97]",
      error: "text-[#C53030]",
    },
    border: "border-[#E0E0E0]",
    input: {
      bg: "bg-white",
      border: "border-[#E0E0E0]",
      focus: "focus-visible:ring-[#37352F]",
    },
    button: {
      bg: "bg-[#37352F]",
      hover: "hover:bg-[#474540]",
      text: "text-white",
    },
    alert: {
      bg: "bg-[#FDE8E8]",
      border: "border-[#F8B4B4]",
    },
    icon: {
      default: "text-[#37352F]",
      muted: "text-[#9B9A97]",
    },
  },
  layout: {
    page: "min-h-screen flex flex-col font-sans",
    card: "bg-white rounded-xl border shadow-sm p-6 sm:p-8",
    container: "flex-1 flex flex-col items-center justify-center p-4 sm:p-8",
    contentWidth: "w-full max-w-[400px]",
  },
  animation: {
    fadeIn: "animate-in fade-in slide-in-from-bottom-4 duration-500",
    alert: "animate-in fade-in slide-in-from-top-1",
  },
};

// Composite classes for common elements
export const notionClasses = {
  pageContainer: `${notionTheme.layout.page} ${notionTheme.colors.bg} ${notionTheme.colors.text.primary}`,
  cardContainer: `${notionTheme.layout.contentWidth} space-y-8 ${notionTheme.animation.fadeIn}`,
  card: `${notionTheme.layout.card} ${notionTheme.colors.border}`,
  input: `pl-9 h-10 ${notionTheme.colors.input.bg} ${notionTheme.colors.input.border} ${notionTheme.colors.text.primary} placeholder:${notionTheme.colors.text.placeholder} focus-visible:ring-1 ${notionTheme.colors.input.focus} focus-visible:border-[#37352F] rounded-lg transition-all`,
  button: `w-full h-10 ${notionTheme.colors.button.bg} ${notionTheme.colors.button.hover} ${notionTheme.colors.button.text} font-medium rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed`,
  label: `text-sm font-medium ${notionTheme.colors.text.primary}`,
  link: `font-medium ${notionTheme.colors.text.primary} hover:underline transition-colors`,
  subLink: `text-xs ${notionTheme.colors.text.secondary} hover:${notionTheme.colors.text.primary} hover:underline transition-colors`,
  errorBox: `p-3 rounded-lg ${notionTheme.colors.alert.bg} ${notionTheme.colors.alert.border} flex items-center gap-2 ${notionTheme.colors.text.error} text-sm ${notionTheme.animation.alert}`,
  iconContainer: `mx-auto w-16 h-16 bg-white border ${notionTheme.colors.border} rounded-xl shadow-sm flex items-center justify-center mb-6`,
};
