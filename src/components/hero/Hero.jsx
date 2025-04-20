import React from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import hero from "../../assets/images/hero.jpg";
import { IoIosArrowRoundForward } from "react-icons/io";
import { motion } from "framer-motion";

export const FadeUp = (delay = 0) => ({
  initial: {
    opacity: 0,
    y: 50,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      duration: 0.5,
      delay: delay,
      ease: "easeInOut",
    },
  },
});

const Hero = () => {
  const navigate = useNavigate(); // ✅ Initialize navigation

  const handleGetStarted = () => {
    const user = localStorage.getItem("user"); // ✅ Check if user is logged in
    if (user) {
      navigate("/upload-srs"); // ✅ Go to upload page if logged in
    } else {
      navigate("/login"); // ✅ Redirect to login if not logged in
    }
  };

  return (
    <section className="bg-white overflow-hidden relative">
      <div className="container mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 min-h-[650px] items-center">
        {/* Left Side - Info */}
        <div className="text-center md:text-left">
          <motion.h1
            variants={FadeUp(0.6)}
            initial="initial"
            animate="animate"
            className="text-4xl md:text-5xl font-bold leading-tight text-gray-900"
          >
            Bridging the gap between{" "}
            <span className="text-blue-600">software requirements</span> and{" "}
            <span className="text-blue-600">implementation</span> — ensuring
            clarity, consistency, and compliance.
          </motion.h1>

          {/* Button for Navigation */}
          <motion.div
            variants={FadeUp(0.8)}
            initial="initial"
            animate="animate"
            className="mt-6"
          >
            <button 
              onClick={handleGetStarted} // ✅ Uses the function
              className="primary-btn flex items-center gap-2 group"
            >
              Get Started
              <IoIosArrowRoundForward className="text-xl transition-transform duration-300 group-hover:translate-x-2 group-hover:-rotate-45" />
            </button>
          </motion.div>
        </div>

        {/* Right Side - Hero Image */}
        <motion.div
          variants={FadeUp(1)}
          initial="initial"
          animate="animate"
          className="flex justify-center"
        >
          <img src={hero} alt="Hero" className="max-w-full h-auto object-cover" />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
