import React from 'react';
import { Link } from 'react-router-dom';
import { FiInstagram, FiLinkedin } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer
      className="relative z-10 mt-auto w-full"
      style={{
        background: `rgba(var(--accent-rgb), 0.02)`,
      }}
    >
      <div 
         className="w-full" 
         style={{ borderTop: `1px solid rgba(var(--accent-rgb), 0.08)` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-start gap-12">
          
          {/* Logo Section */}
          <div className="flex flex-col items-start gap-4 max-w-xs">
            <Logo variant="arena" showText={true} />
            <p className="text-sm text-secondary leading-relaxed mt-2">
              The competitive programming arena built for students. Sharpen your DSA skills, climb the ranks, and dominate.
            </p>
          </div>

          {/* Links and Socials Section */}
          <div className="flex flex-col gap-10">
            {/* Links Section */}
            <div className="flex flex-col sm:flex-row gap-12 sm:gap-24">
              {/* Legal Column */}
              <div className="flex flex-col gap-5">
                <h3 className="text-primary font-bold text-xs tracking-widest uppercase">Legal</h3>
                <div className="flex flex-col gap-3">
                  <Link to="/privacy" className="text-secondary hover:text-accent transition-colors text-sm font-medium">Privacy Policy</Link>
                  <Link to="/terms" className="text-secondary hover:text-accent transition-colors text-sm font-medium">Terms & Conditions</Link>
                </div>
              </div>

              {/* Company Column */}
              <div className="flex flex-col gap-5">
                <h3 className="text-primary font-bold text-xs tracking-widest uppercase">Company</h3>
                <div className="flex flex-col gap-3">
                  <Link to="/about" className="text-secondary hover:text-accent transition-colors text-sm font-medium">About Us</Link>
                  <Link to="/contact" className="text-secondary hover:text-accent transition-colors text-sm font-medium">Contact Us</Link>
                </div>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a 
                href="https://whatsapp.com/channel/0029VbBdIckHVvTRsbC5SJ16" 
                target="_blank" 
                rel="noopener noreferrer"
                title="WhatsApp Channel"
                className="w-10 h-10 rounded-full border border-subtle flex items-center justify-center text-secondary transition-colors hover:text-[#25D366] hover:border-[#25D366] hover:bg-[#25D366]/10"
              >
                <FaWhatsapp size={16} />
              </a>
              <a 
                href="https://www.instagram.com/gdg_iter?igsh=MXFhc3UwdW40NmQ2cg==" 
                target="_blank" 
                rel="noopener noreferrer"
                title="Instagram"
                className="w-10 h-10 rounded-full border border-subtle flex items-center justify-center text-secondary transition-colors hover:text-[#E1306C] hover:border-[#E1306C] hover:bg-[#E1306C]/10"
              >
                <FiInstagram size={16} />
              </a>
              <a 
                href="https://www.linkedin.com/company/google-developer-student-club-iter/" 
                target="_blank" 
                rel="noopener noreferrer"
                title="LinkedIn"
                className="w-10 h-10 rounded-full border border-subtle flex items-center justify-center text-secondary transition-colors hover:text-[#0077B5] hover:border-[#0077B5] hover:bg-[#0077B5]/10"
              >
                <FiLinkedin size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="w-full h-px" style={{ background: `rgba(var(--accent-rgb), 0.15)` }} />
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Logo variant="gdg" size="w-6 h-6" imgClassName="opacity-100" />
          <p className="text-[11px] text-secondary tracking-wider text-center">
            © {new Date().getFullYear()} Algorithm Arena · <span className="text-primary font-bold">GDG On Campus – SOA ITER</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
