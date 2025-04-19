import React from "react";
import { IoMdPulse } from "react-icons/io";
import { RiComputerLine } from "react-icons/ri";
import { TbWorldWww } from "react-icons/tb";
import { IoMdHappy } from "react-icons/io";
import { IoPulseOutline } from "react-icons/io5";
import { BiSupport } from "react-icons/bi";

// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination, Autoplay } from "swiper/modules";

// Service Data
const ServiceData = [
  {
    id: 1,
    title: "Source Code Extraction",
    link: "#",
    icon: <TbWorldWww />,
    delay: 0.2,
  },
  {
    id: 2,
    title: "SRS Extraction",
    link: "#",
    icon: <RiComputerLine />,
    delay: 0.3,
  },
  {
    id: 3,
    title: "Satisfied Clients",
    link: "#",
    icon: <IoMdHappy />,
    delay: 0.4,
  },
  {
    id: 4,
    title: "Compatibility Check Report",
    link: "#",
    icon: <IoPulseOutline />,
    delay: 0.5,
  },
  {
    id: 5,
    title: "Support",
    link: "#",
    icon: <BiSupport />,
    delay: 0.7,
  },
];

const Services = () => {
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center pb-10">
          Services We Provide
        </h1>
        
        {/* Swiper Slider */}
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          autoplay={{ delay: 3000 }}
          pagination={{ clickable: true }}
          className="pb-10"
        >
          {ServiceData.map((service) => (
            <SwiperSlide key={service.id}>
              <div className="bg-gray-100 p-6 rounded-lg text-center shadow-md hover:shadow-lg transition">
                <div className="text-5xl text-blue-600 mb-4 mx-auto">
                  {service.icon}
                </div>
                <h2 className="text-lg font-semibold">{service.title}</h2>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default Services;
