import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const PageHeader = ({ title, subtitle, actions, showBack = false, backUrl }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-subtle pb-6">
      <div className="flex items-start gap-4">
        {showBack && (
          <button
            onClick={handleBack}
            className="mt-1 flex items-center justify-center p-2 rounded-md border border-subtle bg-black/[0.02] dark:bg-white/[0.02] text-secondary hover:text-primary hover:bg-black/[0.05] dark:hover:bg-white/[0.05] active:scale-95 transition-all duration-200"
            title="Go back"
            id="page-header-back-button"
          >
            <FiArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-page-title font-extrabold">{title}</h1>
          {subtitle ? <p className="text-secondary mt-2">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
};

export default PageHeader;

