import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Typography,
    IconButton,
    Link as MuiLink,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper
} from '@mui/material';
import {
    Email as EmailIcon,
    Lock as LockIcon,
    Person as PersonIcon,
    Visibility,
    VisibilityOff,
    School as SchoolIcon,
    VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import CustomInput from '../../../components/CustomInput/CustomInput';
import ForgotPasswordModal from '../../../components/ForgotPasswordModal/ForgotPasswordModal';
import logo from '../../../assets/logo-circle.png';
import './AuthScreen.css';

function AuthScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, isAuthenticated, loading } = useAuth();

    const isRegisterPath = location.pathname === '/register';
    const [isRightPanelActive, setIsRightPanelActive] = useState(isRegisterPath);

    useEffect(() => {
        setIsRightPanelActive(location.pathname === '/register');
    }, [location.pathname]);

    useEffect(() => {
        // Only redirect if authenticated, loading is complete, and not already on dashboard
        // This prevents multiple redirects and page reloads
        if (!loading && isAuthenticated && location.pathname !== '/dashboard') {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, loading, navigate, location.pathname]);

    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });

    const [registerData, setRegisterData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'training_center_admin'
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

    const handleClickShowPassword = () => setShowPassword(!showPassword);
    const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

    const handleLoginChange = (e) => {
        setLoginData({
            ...loginData,
            [e.target.name]: e.target.value
        });
        setLoginError('');
    };

    const handleRegisterChange = (e) => {
        setRegisterData({
            ...registerData,
            [e.target.name]: e.target.value
        });
        setRegisterError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);

        try {
            const result = await login(loginData.email, loginData.password);
            if (result.success) {
                // Check if user account is pending
                if (result.userStatus === 'pending' || result.userStatus === 'inactive') {
                    navigate('/pending-account', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                setLoginError(result.error || 'Invalid email or password.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setLoginError('An error occurred. Please try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setRegisterError('');

        // Validate passwords match
        if (registerData.password !== registerData.confirmPassword) {
            setRegisterError('Passwords do not match.');
            return;
        }

        // Validate password length
        if (registerData.password.length < 8) {
            setRegisterError('Password must be at least 8 characters long.');
            return;
        }

        setRegisterLoading(true);

        try {
            const result = await register(
                registerData.fullName,
                registerData.email,
                registerData.password,
                registerData.confirmPassword,
                registerData.role
            );
            if (result.success) {
                // New registrations typically go to pending account screen
                if (result.userStatus === 'pending' || result.userStatus === 'inactive') {
                    navigate('/pending-account', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                setRegisterError(result.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setRegisterError('An error occurred. Please try again.');
        } finally {
            setRegisterLoading(false);
        }
    };

    const togglePanel = (isRegister) => {
        setIsRightPanelActive(isRegister);
        navigate(isRegister ? '/register' : '/login', { replace: true });
    };

    return (
        <div className="auth-page">
            <div className={`auth-container container ${isRightPanelActive ? "right-panel-active" : ""}`} id="container">

                {/* Sign Up Container */}
                <div className="form-container sign-up-container">
                    <form onSubmit={handleRegisterSubmit}>
                        <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>Register</Typography>

                        <CustomInput
                            placeholder="Name"
                            name="fullName"
                            value={registerData.fullName}
                            onChange={handleRegisterChange}
                            required
                            startIcon={<PersonIcon />}
                        />
                        <CustomInput
                            placeholder="Email"
                            name="email"
                            type="email"
                            value={registerData.email}
                            onChange={handleRegisterChange}
                            required
                            startIcon={<EmailIcon />}
                        />
                        <CustomInput
                            placeholder="Password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={registerData.password}
                            onChange={handleRegisterChange}
                            required
                            startIcon={<LockIcon />}
                            endIcon={
                                <IconButton
                                    onClick={handleClickShowPassword}
                                    edge="end"
                                    size="small"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            }
                        />
                        <CustomInput
                            placeholder="Confirm Password"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={registerData.confirmPassword}
                            onChange={handleRegisterChange}
                            required
                            startIcon={<LockIcon />}
                            endIcon={
                                <IconButton
                                    onClick={handleClickShowConfirmPassword}
                                    edge="end"
                                    size="small"
                                >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            }
                        />
                        
                        {/* Role Selection */}
                        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ width: '100%' }}>
                                <Paper
                                        onClick={() => setRegisterData({ ...registerData, role: 'training_center_admin' })}
                                        elevation={registerData.role === 'training_center_admin' ? 2 : 0}
                                        sx={{
                                            p: 1.5,
                                            cursor: 'pointer',
                                            border: '1.5px solid',
                                            borderColor: registerData.role === 'training_center_admin' ? 'var(--primary-color)' : 'divider',
                                            backgroundColor: registerData.role === 'training_center_admin' 
                                                ? 'rgba(26, 44, 73, 0.08)' 
                                                : 'background.paper',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease-in-out',
                                            width: '100%',
                                            '&:hover': {
                                                backgroundColor: registerData.role === 'training_center_admin' 
                                                    ? 'rgba(26, 44, 73, 0.12)' 
                                                    : 'action.hover',
                                                borderColor: 'var(--primary-color)',
                                                boxShadow: 1
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: registerData.role === 'training_center_admin' 
                                                        ? 'rgba(26, 44, 73, 0.1)' 
                                                        : 'rgba(0, 0, 0, 0.04)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <SchoolIcon 
                                                    sx={{ 
                                                        fontSize: 22, 
                                                        color: registerData.role === 'training_center_admin' 
                                                            ? 'var(--primary-color)' 
                                                            : 'text.secondary' 
                                                    }} 
                                                />
                                            </Box>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                        fontWeight: registerData.role === 'training_center_admin' ? 600 : 500,
                                                        fontSize: '0.75rem',
                                                        color: registerData.role === 'training_center_admin' 
                                                            ? 'var(--primary-color)' 
                                                            : 'text.primary',
                                                        display: 'block',
                                                        lineHeight: 1.2
                                                    }}
                                                >
                                                    Training Center
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Box>
                                <Box sx={{ width: '100%' }}>
                                    <Paper
                                        onClick={() => setRegisterData({ ...registerData, role: 'acc_admin' })}
                                        elevation={registerData.role === 'acc_admin' ? 2 : 0}
                                        sx={{
                                            p: 1.5,
                                            cursor: 'pointer',
                                            border: '1.5px solid',
                                            borderColor: registerData.role === 'acc_admin' ? 'var(--primary-color)' : 'divider',
                                            backgroundColor: registerData.role === 'acc_admin' 
                                                ? 'rgba(26, 44, 73, 0.08)' 
                                                : 'background.paper',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease-in-out',
                                            width: '100%',
                                            '&:hover': {
                                                backgroundColor: registerData.role === 'acc_admin' 
                                                    ? 'rgba(26, 44, 73, 0.12)' 
                                                    : 'action.hover',
                                                borderColor: 'var(--primary-color)',
                                                boxShadow: 1
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: registerData.role === 'acc_admin' 
                                                        ? 'rgba(26, 44, 73, 0.1)' 
                                                        : 'rgba(0, 0, 0, 0.04)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <VerifiedUserIcon 
                                                    sx={{ 
                                                        fontSize: 22, 
                                                        color: registerData.role === 'acc_admin' 
                                                            ? 'var(--primary-color)' 
                                                            : 'text.secondary' 
                                                    }} 
                                                />
                                            </Box>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                        fontWeight: registerData.role === 'acc_admin' ? 600 : 500,
                                                        fontSize: '0.75rem',
                                                        color: registerData.role === 'acc_admin' 
                                                            ? 'var(--primary-color)' 
                                                            : 'text.primary',
                                                        display: 'block',
                                                        lineHeight: 1.2
                                                    }}
                                                >
                                                    Accreditation
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Box>
                        </Box>

                        {registerError && (
                            <Typography color="error" variant="caption" sx={{ mb: 1, display: 'block' }}>
                                {registerError}
                            </Typography>
                        )}

                        <button type="submit" disabled={registerLoading}>
                            {registerLoading ? <CircularProgress size={20} color="inherit" /> : 'Register'}
                        </button>
                    </form>
                </div>

                {/* Sign In Container */}
                <div className="form-container sign-in-container">
                    <form onSubmit={handleLoginSubmit}>
                        <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>Login</Typography>


                        <CustomInput
                            placeholder="Email"
                            name="email"
                            value={loginData.email}
                            onChange={handleLoginChange}
                            required
                            startIcon={<EmailIcon />}
                        />
                        <CustomInput
                            placeholder="Password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={loginData.password}
                            onChange={handleLoginChange}
                            required
                            startIcon={<LockIcon />}
                            endIcon={
                                <IconButton
                                    onClick={handleClickShowPassword}
                                    edge="end"
                                    size="small"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            }
                        />

                        {loginError && (
                            <Typography color="error" variant="caption" sx={{ mb: 1, display: 'block' }}>
                                {loginError}
                            </Typography>
                        )}

                        <MuiLink 
                            href="#" 
                            underline="hover" 
                            sx={{ mt: 1, mb: 2, cursor: 'pointer' }}
                            onClick={(e) => {
                                e.preventDefault();
                                setForgotPasswordOpen(true);
                            }}
                        >
                            Forgot your password?
                        </MuiLink>
                        <button type="submit" disabled={loginLoading}>
                            {loginLoading ? <CircularProgress size={20} color="inherit" /> : 'Login'}
                        </button>
                    </form>
                </div>

                {/* Overlay Container */}
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <img src={logo} alt="Logo" className="overlay-logo" />
                            <Typography variant="h4" fontWeight="bold" color="white" sx={{ mb: 2 }}>Welcome Back!</Typography>
                            <p>To keep connected with us please login with your personal info as Training Center Admin</p>
                            <button className="ghost" id="signIn" onClick={() => togglePanel(false)}>Login</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <img src={logo} alt="Logo" className="overlay-logo" />
                            <Typography variant="h4" fontWeight="bold" color="white" sx={{ mb: 2 }}>Hello, Friend!</Typography>
                            <p>Enter your personal details and start journey with us</p>
                            <button className="ghost" id="signUp" onClick={() => togglePanel(true)}>Register</button>
                        </div>
                    </div>
                </div>
            </div>

            <ForgotPasswordModal
                open={forgotPasswordOpen}
                onClose={() => setForgotPasswordOpen(false)}
            />
        </div>
    );
}

export default AuthScreen;
