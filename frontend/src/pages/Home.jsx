import { Link } from "react-router-dom";
import uberLogo from "../assets/Uber-Logo.wine.png";

const Home = () => {
  return (
    <div className="bg-cover bg-center bg-[url(C:\Users\kruna\OneDrive\Desktop\UBER_CLONE_MERN\frontend\src\assets\Gemini_Generated_Image_g78isng78isng78i.png)] h-screen pt-8 flex justify-between flex-col w-full">
      <img src={uberLogo} alt="Uber Logo" className="w-16 ml-8" />
      <div className="bg-white pb-7 py-4 px-4">
        <h2 className="text-[30px] font-bold">Get Started with Uber</h2>
        <Link to='/login' className="flex items-center justify-center w-full bg-black text-white py-3 rounded-lg mt-5">Continue</Link>
      </div>
    </div>
  );
};

export default Home;