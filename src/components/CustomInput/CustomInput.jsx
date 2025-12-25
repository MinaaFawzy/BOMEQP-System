import React, { useEffect, useRef } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import './CustomInput.css';

const CustomInput = ({ 
  placeholder, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  required = false, 
  startIcon, 
  endIcon,
  error,
  helperText,
  InputProps: customInputProps,
  ...props 
}) => {
  const containerRef = useRef(null);

  // Remove browser's default password reveal button aggressively
  useEffect(() => {
    if (type === 'password' && containerRef.current) {
      const removeBrowserPasswordButton = () => {
        // Find the actual input element
        const input = containerRef.current?.querySelector('input[type="password"]');
        
        if (input) {
          // Find the Material-UI input container
          const container = input.closest('.MuiOutlinedInput-root');
          
          if (container) {
            // Find all buttons in the container and parent elements
            const allButtons = [
              ...container.querySelectorAll('button'),
              ...(container.parentElement?.querySelectorAll('button') || [])
            ];
            
            allButtons.forEach(button => {
              // Check if this button is NOT our custom eye icon button
              // Our custom button will be inside MuiInputAdornment-root
              const isCustomButton = button.closest('.MuiInputAdornment-root') !== null;
              
              if (!isCustomButton) {
                // This is likely the browser's default button - aggressively remove it
                button.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; position: absolute !important; left: -9999px !important;';
                try {
                  button.remove();
                } catch (e) {
                  // If remove fails, at least hide it completely
                }
              }
            });

            // Also check for any elements that look like password reveal buttons
            const allElements = container.querySelectorAll('*');
            allElements.forEach(el => {
              // Check for browser-specific classes or attributes
              if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'SPAN') {
                const isCustomButton = el.closest('.MuiInputAdornment-root') !== null;
                if (!isCustomButton) {
                  const rect = el.getBoundingClientRect();
                  const inputRect = input.getBoundingClientRect();
                  // If element is positioned near the right edge and is small (like an icon button)
                  // IE often uses span elements for the reveal button
                  if ((rect.width < 50 && rect.height < 50 && 
                      Math.abs(rect.right - inputRect.right) < 50) ||
                      // IE specific: check for elements with reveal-related classes/attributes
                      el.className && (el.className.indexOf('reveal') !== -1 || el.className.indexOf('password') !== -1)) {
                    el.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; width: 0 !important; height: 0 !important; position: absolute !important; left: -9999px !important;';
                    try {
                      el.remove();
                    } catch (e) {
                      // Continue if removal fails (IE might not support remove)
                      if (el.parentNode) {
                        try {
                          el.parentNode.removeChild(el);
                        } catch (e2) {
                          // If all else fails, just hide it
                        }
                      }
                    }
                  }
                }
              }
            });

            // IE specific: Try to find and remove the reveal button using IE's structure
            // IE often adds the reveal button as a sibling or in a specific structure
            if (input.parentElement) {
              const siblings = Array.from(input.parentElement.children);
              siblings.forEach(sibling => {
                if (sibling !== input && sibling !== container) {
                  const isCustomButton = sibling.closest('.MuiInputAdornment-root') !== null;
                  if (!isCustomButton) {
                    const rect = sibling.getBoundingClientRect();
                    const inputRect = input.getBoundingClientRect();
                    // Check if it's positioned like a reveal button
                    if (rect.width < 30 && rect.height < 30 && 
                        Math.abs(rect.right - inputRect.right) < 40 &&
                        Math.abs(rect.top - inputRect.top) < 20) {
                      sibling.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; width: 0 !important; height: 0 !important;';
                      try {
                        sibling.remove();
                      } catch (e) {
                        if (sibling.parentNode) {
                          try {
                            sibling.parentNode.removeChild(sibling);
                          } catch (e2) {
                            // Just hide it
                          }
                        }
                      }
                    }
                  }
                }
              });
            }
          }
        }
      };

      // Inject global CSS to hide browser password buttons (including IE)
      const styleId = 'hide-browser-password-button';
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          input[type="password"]::-webkit-credentials-auto-fill-button,
          input[type="password"]::-webkit-strong-password-auto-fill-button,
          .custom-input-field input[type="password"]::-webkit-credentials-auto-fill-button,
          .custom-input-field input[type="password"]::-webkit-strong-password-auto-fill-button {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            appearance: none !important;
            -webkit-appearance: none !important;
          }
          /* Internet Explorer specific */
          input[type="password"]::-ms-reveal,
          .custom-input-field input[type="password"]::-ms-reveal,
          .custom-input-field .MuiOutlinedInput-input[type="password"]::-ms-reveal {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Run immediately and frequently
      removeBrowserPasswordButton();
      const intervals = [];
      for (let i = 0; i < 20; i++) {
        intervals.push(setTimeout(removeBrowserPasswordButton, i * 50));
      }

      // Use MutationObserver to watch for DOM changes (browser adding buttons)
      // Note: IE doesn't support MutationObserver, so we'll use fallback for IE
      const input = containerRef.current?.querySelector('input[type="password"]');
      const container = input?.closest('.MuiOutlinedInput-root');
      
      let observer = null;
      if (container && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(() => {
          removeBrowserPasswordButton();
        });
        
        observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }

      // Continuous interval check to catch any buttons that appear
      const intervalId = setInterval(removeBrowserPasswordButton, 100);

      // Listen for all events that might trigger browser to add the button
      if (input) {
        const events = ['input', 'focus', 'click', 'keydown', 'keyup', 'paste', 'change', 'blur', 'mousedown', 'mouseup'];
        events.forEach(eventType => {
          input.addEventListener(eventType, removeBrowserPasswordButton, { capture: true, passive: true });
          container?.addEventListener(eventType, removeBrowserPasswordButton, { capture: true, passive: true });
        });

        return () => {
          intervals.forEach(id => clearTimeout(id));
          clearInterval(intervalId);
          if (observer) {
            observer.disconnect();
          }
          events.forEach(eventType => {
            input.removeEventListener(eventType, removeBrowserPasswordButton, { capture: true });
            container?.removeEventListener(eventType, removeBrowserPasswordButton, { capture: true });
          });
        };
      }

      return () => {
        intervals.forEach(id => clearTimeout(id));
        clearInterval(intervalId);
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, [type, value, endIcon]); // Re-run when type, value, or endIcon changes
  // Build startAdornment - use startIcon if provided, otherwise use customInputProps
  let startAdornment = null;
  if (startIcon) {
    startAdornment = (
      <InputAdornment position="start" className="custom-input-icon">
        {startIcon}
      </InputAdornment>
    );
  } else if (customInputProps?.startAdornment) {
    startAdornment = customInputProps.startAdornment;
  }

  // Build endAdornment - use endIcon if provided (completely replace), otherwise use customInputProps
  let endAdornment = null;
  if (endIcon) {
    endAdornment = (
      <InputAdornment position="end">
        {endIcon}
      </InputAdornment>
    );
  } else if (customInputProps?.endAdornment) {
    endAdornment = customInputProps.endAdornment;
  }

  // Merge custom InputProps with our startIcon and endIcon
  // When endIcon is provided, it completely replaces any existing endAdornment
  // Explicitly set endAdornment to prevent any default password visibility toggles
  const mergedInputProps = {
    ...customInputProps,
    startAdornment,
    endAdornment: endAdornment, // Explicitly set to null if no endIcon, preventing defaults
  };

  // Extract InputProps and inputProps from props to prevent override
  const { InputProps: propsInputProps, inputProps: propsInputPropsLower, ...restProps } = props;

  // Merge inputProps with autoComplete setting for password fields
  const mergedInputPropsLower = {
    autoComplete: type === 'password' ? 'new-password' : 'off',
    ...propsInputPropsLower,
  };

  return (
    <div ref={containerRef} className="custom-input-wrapper">
      <TextField
        className="custom-input-field"
        placeholder={placeholder}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth
        variant="outlined"
        InputProps={mergedInputProps}
        inputProps={mergedInputPropsLower}
        {...restProps}
      />
    </div>
  );
};

export default CustomInput;
