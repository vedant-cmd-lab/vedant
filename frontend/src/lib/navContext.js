import { createContext, useContext } from "react";

export const NavContext = createContext({ hidden: false, setHidden: () => {} });
export const useNav = () => useContext(NavContext);
