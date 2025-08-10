import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text_white">P</span>
            </div>
            <span className="text-gray-400">© 2025 PillarPayout. All rights reserved.</span>
          </div>
          
          <div className="flex space-x-6 text-gray-400">
            <button type="button" className="hover:text-white transition-colors">Privacy Policy</button>
            <button type="button" className="hover:text-white transition-colors">Terms of Service</button>
            <button type="button" className="hover:text-white transition-colors">Support</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
