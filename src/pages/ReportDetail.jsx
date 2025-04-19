import React from 'react';
import Navbar from "../components/Navbar/Navbar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const data = [
  { name: 'Implemented', value: 50, color: '#008000' },  // dark green
  { name: 'Partially Implemented', value: 30, color: '#FCA500' },  // mustard
  { name: 'Unimplemented', value: 20, color: '#BF3737' },  // dark red
];

const ReportDetail = () => {
  return (
    <>
      <Navbar /> 
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <header className="bg-blue-500 text-white text-left text-xl font-semibold py-4 px-6 rounded-lg shadow-md">
        Compatibility Report
      </header>

      {/* Charts Section */}
      <div className="flex flex-col md:flex-row justify-between items-center my-8 gap-10">
        {/* Bar Chart */}
        <div className="w-1/3 bg-white p-4 shadow-md rounded-lg flex flex-col items-center">
          <h2 className="text-left text-lg font-semibold w-full">Implementation Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart (Overall Compatibility on the Right) */}
        <div className="w-1/3 bg-white p-4 shadow-md rounded-lg flex flex-col items-center ml-auto">
          <h2 className="text-lg font-semibold w-full text-left">Overall Compatibility</h2>
          <PieChart width={200} height={200}>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <p className="text-xl font-bold mt-2">80%</p>
          <p className="text-gray-500">Compatibility</p>
        </div>
      </div>

      {/* Requirements Table */}
      <div className="bg-white p-4 shadow-md rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-left">Requirements</h2>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="text-left text-white border bg-blue-500 px-4 py-2">Title</th>
              <th className="text-left text-white border bg-blue-500 px-4 py-2">Description</th>
              <th className="text-left text-white border bg-blue-500 px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Requirement 1</td>
              <td className="border border-gray-300 px-4 py-2">Description of requirement 1</td>
              <td className="border border-gray-300 px-4 py-2" style={{ color: '#008000' }}>Implemented</td> {/* Dark Green */}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Requirement 2</td>
              <td className="border border-gray-300 px-4 py-2">Description of requirement 2</td>
              <td className="border border-gray-300 px-4 py-2" style={{ color: '#FCA500' }}>Partially Implemented</td> {/* Mustard */}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Requirement 3</td>
              <td className="border border-gray-300 px-4 py-2">Description of requirement 3</td>
              <td className="border border-gray-300 px-4 py-2" style={{ color: '#BF3737' }}>Unimplemented</td> {/* Dark Red */}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default ReportDetail;
