import React from 'react';

interface DateDebuggerProps {
  dateString: string | null | undefined;
  label: string;
}

const DateDebugger: React.FC<DateDebuggerProps> = ({ dateString, label }) => {
  if (!dateString) {
    return (
      <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded mb-2">
        <h3 className="font-bold">{label} is missing</h3>
        <p>Value: {String(dateString)}</p>
        <p>Type: {typeof dateString}</p>
      </div>
    );
  }

  let dateObj: Date | null = null;
  let isValid = false;
  let formattedDate = '';
  
  try {
    dateObj = new Date(dateString);
    isValid = !isNaN(dateObj.getTime());
    formattedDate = isValid ? dateObj.toLocaleString() : 'Invalid Date';
  } catch (error) {
    console.error(`Error parsing date ${dateString}:`, error);
  }

  return (
    <div className={`p-2 ${isValid ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'} rounded mb-2`}>
      <h3 className="font-bold">{label}</h3>
      <p>Raw value: {dateString}</p>
      <p>Type: {typeof dateString}</p>
      <p>Valid: {isValid ? 'Yes' : 'No'}</p>
      <p>Formatted: {formattedDate}</p>
      {dateObj && isValid && (
        <>
          <p>Year: {dateObj.getFullYear()}</p>
          <p>Month: {dateObj.getMonth() + 1}</p>
          <p>Day: {dateObj.getDate()}</p>
          <p>ISO String: {dateObj.toISOString()}</p>
        </>
      )}
    </div>
  );
};

export default DateDebugger; 