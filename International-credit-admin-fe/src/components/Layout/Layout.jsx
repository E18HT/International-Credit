import React from "react";

const Layout = ({ title, description, ButtonComponent, children }) => {
  return (
    <div className="flex flex-col h-screen  max-w-[1440px] w-full mx-auto">
      <div className="p-6 flex justify-between items-center">
        <div className=" w-fit flex flex-col">
          <h1 className="text-3xl font-bold text-gray-600 dark:text-gray-50 flex items-center">
            {title}
          </h1>
          {description && (
            <p className="text-body text-gray-600 dark:text-gray-200 font-inter mt-1">
              {description}
            </p>
          )}{" "}
        </div>
        {ButtonComponent}
      </div>
      <div className="space-y-6 p-6 pt-0 h-[calc(100vh-84px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;
