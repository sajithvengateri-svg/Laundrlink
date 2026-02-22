export function HubSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hub Settings</h1>
        <p className="text-sm text-indigo-600 font-medium mb-6">Phase 2 - Hub Configuration coming soon</p>

        <div className="space-y-3">
          {['Hub Name', 'Operating Hours', 'Service Area', 'Pricing Tiers', 'Notifications'].map((setting) => (
            <div
              key={setting}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between"
            >
              <span className="text-sm font-medium text-gray-700">{setting}</span>
              <span className="text-xs text-gray-300 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                Coming soon
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Full hub configuration available in Phase 2.
        </p>
      </div>
    </div>
  );
}
