import React from 'react';
import { Receipt, Calendar, Zap, DollarSign, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils';

interface FareBreakdownProps {
  monthlyRent: number;
  ebBillShare: number;
  amountPaid: number;
  status: 'due' | 'partial' | 'paid';
  totalRoomEB?: number;
  roommatesCount?: number;
}

const FareBreakdown: React.FC<FareBreakdownProps> = ({
  monthlyRent,
  ebBillShare,
  amountPaid,
  status,
  totalRoomEB,
  roommatesCount
}) => {
  const baseRent = monthlyRent; // This is the base rent from tenancy
  const totalDue = baseRent + ebBillShare;
  const remaining = totalDue - amountPaid;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-white">Monthly Fare Breakdown</h2>
            <p className="text-sm text-blue-100">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          status === 'paid' 
            ? 'bg-green-100 text-green-800'
            : status === 'partial'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {status.toUpperCase()}
        </span>
      </div>

      <div className="bg-white bg-opacity-10 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
          <div>
            <p className="text-sm text-blue-100 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Monthly Rent
            </p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(baseRent)}
            </p>
            <p className="text-xs text-blue-200 mt-1">Base rent</p>
          </div>

          <div>
            <p className="text-sm text-blue-100 mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              EB Bill Share
            </p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(ebBillShare)}
            </p>
            {totalRoomEB && roommatesCount && (
              <p className="text-xs text-blue-200 mt-1">
                Room Total: {formatCurrency(totalRoomEB)} ÷ {roommatesCount} tenants
              </p>
            )}
          </div>

          <div>
            <p className="text-sm text-blue-100 mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Total Due
            </p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(totalDue)}
            </p>
            <p className="text-xs text-blue-200 mt-1">This month</p>
          </div>

          <div>
            <p className="text-sm text-blue-100 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Amount Paid
            </p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(amountPaid)}
            </p>
            {remaining > 0 && (
              <p className="text-xs text-red-200 mt-1">
                Remaining: {formatCurrency(remaining)}
              </p>
            )}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="border-t border-blue-400 border-opacity-30 pt-4 mt-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-100">Base Rent:</span>
            <span className="text-white font-semibold">{formatCurrency(baseRent)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-100">EB Bill Share:</span>
            <span className="text-white font-semibold">
              {formatCurrency(ebBillShare)}
              {totalRoomEB && roommatesCount && ` (${formatCurrency(totalRoomEB)} ÷ ${roommatesCount})`}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm pt-2 border-t border-blue-400 border-opacity-20">
            <span className="text-blue-100 font-semibold">Total Monthly Fare:</span>
            <span className="text-white font-bold text-lg">{formatCurrency(totalDue)}</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-1 border-t border-blue-400 border-opacity-10">
            <span className="text-blue-200">Amount Paid:</span>
            <span className="text-white">{formatCurrency(amountPaid)}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default FareBreakdown;

