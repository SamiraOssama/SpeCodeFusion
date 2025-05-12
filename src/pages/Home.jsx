import React from "react";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/hero/Hero";
import Services from "../components/Services/Services";
import Banner from "../components/Banner/Banner";
import Subscribe from "../components/Subscribe/Subscribe";

const Home = () => {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Hero />
      <Services />
      <Banner/>
      <Subscribe/>
    </div>
  );
};

export default Home;
