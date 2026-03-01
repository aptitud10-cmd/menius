export default function RestaurantPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-white text-gray-900">
      {children}
    </div>
  );
}
