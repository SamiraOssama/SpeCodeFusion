import React from "react";
import { FaBell } from "react-icons/fa";
import cover from "../../assets/images/cover.gif"; // Update to point to your GIF

const Subscribe = () => {
  return (
    <section className="bg-[#f7f7f7] py-20">
      <div
        style={{
          backgroundImage: `url(${cover})`, // Replace image with GIF
          backgroundSize: "contain", // Ensure the GIF fits inside the container
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat", // Prevent the GIF from repeating
        }}
        className="container mx-auto px-6 md:px-12 lg:px-20 py-16 rounded-lg shadow-md"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Button comes before the text */}
          <a
            href="#"
            className="bg-dark text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-blue-600 transition duration-200 mt-[-20px]"
          >
            Subscribe Now
            <FaBell className="text-lg animate-none hover:animate-bounce" />
          </a>

          {/* Heading comes after the button, move it up */}
          <h1 className="text-3xl md:text-4xl font-bold leading-snug text-dark bg-white rounded-2xl border-2 border-dark mt-[-20px]">
  10K+ Students are learning from us
</h1>

          <p className="text-white max-w-xl"></p>
        </div>
      </div>
    </section>
  );
};

export default Subscribe;
