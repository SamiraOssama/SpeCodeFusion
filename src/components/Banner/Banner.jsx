import React from "react";
import hero1 from "../../assets/images/hero1.jpg";
import { FaBookReader } from "react-icons/fa";
import { motion } from "framer-motion";
import { FadeUp } from "../hero/Hero"; // Ensure FadeUp is correctly exported
import { GrUserExpert } from "react-icons/gr";
import {MdOutlineAccessTime} from "react-icons/md";

const Banner = () => {
  return (
    <section className="bg-white">
      <div className="container mx-auto py-14 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Banner Image */}
        <div className="flex justify-center items-center">
          <img 
            src={hero1} 
            alt="Hero" 
            className="w-[350px] md:max-w-[450px] object-cover drop-shadow-lg"
          />
        </div>

        {/* Banner Text */}
        <div className="flex flex-col justify-center">
          <div className="text-center md:text-left space-y-12">
            <h1 className="text-3xl md:text-4xl font-bold leading-snug">
              The World's Leading Compatibility between SRS and Source Code Platform
            </h1>

            {/* Stats Card */}
            <motion.div
              variants={FadeUp(0.4)}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="flex items-center gap-4 p-6 bg-gray-100 rounded-2xl hover:bg-white duration-300 shadow-md hover:shadow-2xl"
            >
              <FaBookReader className="text-2xl text-blue-600" />
              <p className="text-lg font-semibold">10,000+ Users</p>
            </motion.div>
            <motion.div
              variants={FadeUp(0.6)}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="flex items-center gap-4 p-6 bg-gray-100 rounded-2xl hover:bg-white duration-300 shadow-md hover:shadow-2xl"
            >
              <GrUserExpert className="text-2xl text-blue-600" />
              <p className="text-lg font-semibold">Useful for developers,testers ,professors &students</p>
            </motion.div>
            <motion.div
              variants={FadeUp(0.8)}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="flex items-center gap-4 p-6 bg-gray-100 rounded-2xl hover:bg-white duration-300 shadow-md hover:shadow-2xl"
            >
              <MdOutlineAccessTime className="text-2xl text-blue-600" />
              <p className="text-lg font-semibold">Limitless access</p>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Banner;
