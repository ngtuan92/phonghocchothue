import { toast } from 'react-hot-toast';

export const showToastSuccess = (message) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
};

export const showToastError = (message) => {
  toast.error(message, {
    duration: 3000,
    position: 'top-right',
  });
};
