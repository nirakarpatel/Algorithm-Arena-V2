import React from 'react';
import { clsx } from 'clsx';

const Logo = ({
  variant = 'arena',
  size = 'md',
  className,
  imgClassName,
  showText = false,
  textColorClass = "text-primary",
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48',
  };

  const selectedSize = sizeClasses[size] || size;

  let src = '';
  switch (variant) {
    case 'arena':
      src = '/algoarena-logo.svg';
      break;
    case 'gdg':
      src = '/gdg-logo-orignal.svg';
      break;
    case 'hybrid':
      src = '/gdg-logo.svg';
      break;
    default:
      src = '/algoarena-logo.svg';
  }

  const Img = (
    <img
      src={src}
      alt={`${variant} logo`}
      className={clsx('object-contain bg-transparent', selectedSize, imgClassName)}
      {...props}
    />
  );

  if (!showText) {
    return React.cloneElement(Img, { className: clsx(Img.props.className, className) });
  }

  return (
    <div className={clsx("inline-flex items-center gap-3", className)}>
      {Img}
      <div className="flex flex-col justify-center min-w-0 select-none">
        {variant === "arena" && (
          <span className={clsx("font-black text-lg leading-none", textColorClass)}>
            Algo<span style={{ color: "rgb(var(--accent-rgb))" }}>Arena</span>
          </span>
        )}

        {variant === "gdg" && (
          <>
            <span className={clsx("font-black tracking-tight text-sm leading-none", textColorClass)}>
              GDG on Campus
            </span>
            <span className="text-[10px] text-secondary tracking-widest font-black uppercase mt-0.5">
              SOA ITER
            </span>
          </>
        )}

        {variant === "hybrid" && (
          <span className={clsx("font-black tracking-tight text-lg leading-none uppercase", textColorClass)}>
            GDG <span style={{ color: "rgb(var(--accent-rgb))" }}>Arena</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
