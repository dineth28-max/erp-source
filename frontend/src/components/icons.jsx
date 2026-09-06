// Minimal inline-SVG icon set - avoids pulling in an icon library for ~8 glyphs.
// All 20x20, 1.5px stroke, currentColor so they inherit text color from context.

const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };

export const GridIcon = (props) => (
  <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);

export const BoxIcon = (props) => (
  <svg {...base} {...props}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
);

export const CartIcon = (props) => (
  <svg {...base} {...props}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6" /></svg>
);

export const UsersIcon = (props) => (
  <svg {...base} {...props}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16.5 5.5a3.5 3.5 0 0 1 0 7" /><path d="M15.5 13.2a6.5 6.5 0 0 1 6 6.8" /></svg>
);

export const SettingsIcon = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);

export const LockIcon = (props) => (
  <svg {...base} {...props}><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);

export const BellIcon = (props) => (
  <svg {...base} {...props}><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);

export const SearchIcon = (props) => (
  <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);

export const ChevronDownIcon = (props) => (
  <svg {...base} {...props}><path d="M6 9l6 6 6-6" /></svg>
);

export const MenuIcon = (props) => (
  <svg {...base} {...props}><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
);

export const ChartIcon = (props) => (
  <svg {...base} {...props}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="0.5" /><rect x="13" y="8" width="3" height="10" rx="0.5" /><rect x="17.5" y="14" width="3" height="4" rx="0.5" /></svg>
);

export const TruckIcon = (props) => (
  <svg {...base} {...props}><rect x="1" y="7" width="14" height="9" rx="1" /><path d="M15 10h4l3 3v3h-7z" /><circle cx="6.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></svg>
);

export const DollarIcon = (props) => (
  <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.3c0 3 6 1.5 6 4.4 0 1.4-1.3 2.3-3 2.3s-3-1-3-2.4" /></svg>
);

export const AlertIcon = (props) => (
  <svg {...base} {...props}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86l-8.18 14.18A1.5 1.5 0 0 0 3.4 20.5h17.2a1.5 1.5 0 0 0 1.3-2.46L13.71 3.86a1.5 1.5 0 0 0-2.6 0z" /></svg>
);
