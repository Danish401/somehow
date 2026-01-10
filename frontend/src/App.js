import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Avatar,
  Divider,
  Paper,
  alpha
} from '@mui/material';
import {
  Email as EmailIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

// Create a beautiful dark theme with purple/blue gradients
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

// Motion variants for animations
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function App() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ count: 0 });

  useEffect(() => {
    fetchEmails();
    fetchStats();

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('newEmail', (data) => {
      setNotification({
        type: 'success',
        message: data.message,
        email: data.email
      });
      fetchEmails();
      fetchStats();
      
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    });
    
    socket.on('newResume', (data) => {
      socket.emit('newEmail', data);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socket.off('connect');
      socket.off('newResume');
      socket.off('disconnect');
    };
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/resumes`);
      setEmails(response.data);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch emails'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/resumes/stats/count`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const deleteEmail = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/resumes/${id}`);
      fetchEmails();
      fetchStats();
      setNotification({
        type: 'success',
        message: 'Email deleted successfully'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error deleting email:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete email'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
          padding: { xs: 2, sm: 3, md: 4 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ textAlign: 'center', mb: 4, mt: 2 }}>
              <Typography
                variant="h1"
                sx={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 1,
                  fontWeight: 800,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                }}
              >
                📧 Email Monitor
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  mb: 3,
                }}
              >
                Real-time Email Processing System
              </Typography>

              {/* Stats Cards */}
              <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      sx={{
                        background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="h2" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                          {stats.count}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          Total Emails
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      sx={{
                        background: socket.connected
                          ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%)'
                          : 'linear-gradient(145deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        {socket.connected ? (
                          <CheckCircleIcon sx={{ fontSize: 40, color: '#10b981', mb: 1 }} />
                        ) : (
                          <ErrorIcon sx={{ fontSize: 40, color: '#ef4444', mb: 1 }} />
                        )}
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {socket.connected ? 'Connected' : 'Disconnected'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              </Grid>
            </Box>
          </motion.div>

          {/* Notification Snackbar */}
          <Snackbar
            open={!!notification}
            autoHideDuration={5000}
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert
              onClose={handleCloseNotification}
              severity={notification?.type || 'info'}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {notification?.message}
            </Alert>
          </Snackbar>

          {/* Main Content */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <CircularProgress size={60} sx={{ color: '#6366f1' }} />
            </Box>
          ) : emails.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                sx={{
                  textAlign: 'center',
                  py: 8,
                  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)',
                }}
              >
                <CardContent>
                  <EmailIcon sx={{ fontSize: 80, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                  <Typography variant="h4" sx={{ mb: 1, color: '#fff' }}>
                    No emails found
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Emails received today will appear here in real-time
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Grid container spacing={3}>
              <AnimatePresence>
                {emails.map((email, index) => (
                  <Grid item xs={12} sm={6} lg={4} key={email._id}>
                    <motion.div
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          overflow: 'visible',
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1, p: 3 }}>
                          {/* Header */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                              <Avatar
                                sx={{
                                  bgcolor: email.hasAttachment ? '#6366f1' : '#8b5cf6',
                                  width: 48,
                                  height: 48,
                                }}
                              >
                                {(email.fromName || email.from || 'U')[0].toUpperCase()}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontWeight: 600,
                                    color: '#fff',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {email.fromName || email.from?.split('@')[0] || 'Unknown Sender'}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {email.from || 'N/A'}
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this email?')) {
                                  deleteEmail(email._id);
                                }
                              }}
                              sx={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': {
                                  color: '#ef4444',
                                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          {/* Subject */}
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              color: '#fff',
                              mb: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {email.subject || 'No Subject'}
                          </Typography>

                          <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

                          {/* PDF Attachment Data */}
                          {email.hasAttachment && email.attachmentData && (
                            <Box
                              sx={{
                                mb: 2,
                                p: 2,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <AttachFileIcon sx={{ fontSize: 18, color: '#818cf8' }} />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: '#a78bfa' }}>
                                  PDF ATTACHMENT DATA
                                </Typography>
                              </Box>
                              
                              {email.attachmentData.name && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <PersonIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                                    {email.attachmentData.name}
                                  </Typography>
                                </Box>
                              )}
                              {email.attachmentData.email && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <EmailIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                    {email.attachmentData.email}
                                  </Typography>
                                </Box>
                              )}
                              {email.attachmentData.contactNumber && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <PhoneIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                    {email.attachmentData.contactNumber}
                                  </Typography>
                                </Box>
                              )}
                              {email.attachmentData.dateOfBirth && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CalendarIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                    {email.attachmentData.dateOfBirth}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}

                          {/* Email Body */}
                          <Paper
                            sx={{
                              p: 2,
                              mb: 2,
                              bgcolor: 'rgba(0, 0, 0, 0.2)',
                              maxHeight: '150px',
                              overflow: 'auto',
                              '&::-webkit-scrollbar': {
                                width: '6px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '3px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '3px',
                                '&:hover': {
                                  background: 'rgba(255, 255, 255, 0.3)',
                                },
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'rgba(255, 255, 255, 0.8)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '0.875rem',
                                lineHeight: 1.6,
                              }}
                            >
                              {email.body || '(No content)'}
                            </Typography>
                          </Paper>

                          {/* Footer */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <CalendarIcon sx={{ fontSize: 14 }} />
                              {formatDate(email.receivedAt || email.createdAt)}
                            </Typography>
                            {email.hasAttachment && (
                              <Chip
                                icon={<AttachFileIcon />}
                                label="PDF"
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(99, 102, 241, 0.2)',
                                  color: '#a78bfa',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                }}
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
          )}
        </Container>
      </Box>

      <style>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </ThemeProvider>
  );
}

export default App;
