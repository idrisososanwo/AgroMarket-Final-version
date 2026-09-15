export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading AgroMarket...
        </p>
      </div>
    </div>
  );
}
