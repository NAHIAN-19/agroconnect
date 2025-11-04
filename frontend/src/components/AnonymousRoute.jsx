import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const AnonymousRoute = () => {
  const { isAuth } = useAuthStore();

  if (isAuth) {
    return <Navigate to="/market" replace />;
  }

  return <Outlet />;
};

export default AnonymousRoute;
