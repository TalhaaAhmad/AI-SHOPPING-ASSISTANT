export default function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full mt-10">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-inset ring-gray-200 px-6 py-5 max-w-lg w-full">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to AI Shopping Assistant! 🛍️
        </h2>
        <p className="text-gray-600 mb-4 leading-relaxed">
          I can help you with:
        </p>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Finding the best deals and prices online</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Comparing products and features</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Searching for specific items across stores</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Providing product reviews and ratings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Helping with purchase decisions</span>
          </li>
        </ul>
        <p className="text-gray-600 mt-4 leading-relaxed">
          Ready to find your perfect purchase? Let&apos;s start shopping smart!
        </p>
      </div>
    </div>
  );
}