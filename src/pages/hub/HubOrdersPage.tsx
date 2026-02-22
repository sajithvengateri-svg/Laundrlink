export function HubOrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hub Orders</h1>
        <p className="text-sm text-indigo-600 font-medium mb-6">Phase 2 - Hub Order Management coming soon</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No Orders Yet</h2>
          <p className="text-gray-400 text-sm">
            Coming in Phase 2 — view, sort, and action all orders assigned to this hub.
          </p>
        </div>
      </div>
    </div>
  );
}
