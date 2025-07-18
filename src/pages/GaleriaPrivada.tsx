
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, Shield, Share2, Smartphone, Upload, FolderOpen } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthData {
  user: User;
  token: string;
  expiresAt: number;
}

const GaleriaPrivada = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Formularios
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const sessionData = localStorage.getItem('galeria_privada_session');
      if (sessionData) {
        const session: AuthData = JSON.parse(sessionData);
        const now = new Date().getTime();
        
        if (session.expiresAt > now) {
          setCurrentUser(session.user);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('galeria_privada_session');
        }
      }
    } catch (error) {
      console.error('Error cargando sesión:', error);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const generateToken = (length = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { username, password } = loginForm;
      
      if (!username || !password) {
        toast({
          title: "Error",
          description: "Por favor, completa todos los campos",
          variant: "destructive"
        });
        return;
      }

      // Obtener usuarios existentes
      const users = JSON.parse(localStorage.getItem('galeria_privada_users') || '{}');
      const passwordHash = await hashPassword(password);
      
      // Buscar usuario
      let foundUser = null;
      for (const userId in users) {
        const user = users[userId];
        if ((user.username === username || user.email === username) && user.passwordHash === passwordHash) {
          foundUser = { id: userId, username: user.username, email: user.email };
          break;
        }
      }

      if (!foundUser) {
        toast({
          title: "Error",
          description: "Usuario o contraseña incorrectos",
          variant: "destructive"
        });
        return;
      }

      // Crear sesión
      const token = generateToken(64);
      const expiresAt = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 horas
      
      const sessionData: AuthData = {
        user: foundUser,
        token,
        expiresAt
      };

      localStorage.setItem('galeria_privada_session', JSON.stringify(sessionData));
      
      setCurrentUser(foundUser);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });

      toast({
        title: "¡Bienvenido!",
        description: `Has iniciado sesión como ${foundUser.username}`,
      });

    } catch (error) {
      console.error('Error en login:', error);
      toast({
        title: "Error",
        description: "Error al iniciar sesión",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { username, email, password, confirmPassword } = registerForm;
      
      if (!username || !email || !password || !confirmPassword) {
        toast({
          title: "Error",
          description: "Por favor, completa todos los campos",
          variant: "destructive"
        });
        return;
      }

      if (username.length < 3) {
        toast({
          title: "Error",
          description: "El nombre de usuario debe tener al menos 3 caracteres",
          variant: "destructive"
        });
        return;
      }

      if (!validateEmail(email)) {
        toast({
          title: "Error",
          description: "El email no es válido",
          variant: "destructive"
        });
        return;
      }

      if (password.length < 8) {
        toast({
          title: "Error",
          description: "La contraseña debe tener al menos 8 caracteres",
          variant: "destructive"
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive"
        });
        return;
      }

      // Verificar si el usuario ya existe
      const users = JSON.parse(localStorage.getItem('galeria_privada_users') || '{}');
      
      for (const userId in users) {
        const user = users[userId];
        if (user.username === username || user.email === email) {
          toast({
            title: "Error",
            description: "El usuario o email ya existe",
            variant: "destructive"
          });
          return;
        }
      }

      // Crear usuario
      const userId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const passwordHash = await hashPassword(password);
      
      users[userId] = {
        username,
        email,
        passwordHash,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('galeria_privada_users', JSON.stringify(users));

      // Crear datos de usuario
      const userData = {
        folders: {
          root: {
            id: 'root',
            name: 'Mi Galería',
            files: [],
            subfolders: [],
            createdAt: new Date().toISOString()
          }
        },
        settings: {
          language: 'es',
          theme: 'light'
        }
      };

      localStorage.setItem(`galeria_privada_user_${userId}`, JSON.stringify(userData));

      // Crear sesión automática
      const newUser = { id: userId, username, email };
      const token = generateToken(64);
      const expiresAt = new Date().getTime() + (24 * 60 * 60 * 1000);
      
      const sessionData: AuthData = {
        user: newUser,
        token,
        expiresAt
      };

      localStorage.setItem('galeria_privada_session', JSON.stringify(sessionData));
      
      setCurrentUser(newUser);
      setIsLoggedIn(true);
      setShowRegisterModal(false);
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });

      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente",
      });

    } catch (error) {
      console.error('Error en registro:', error);
      toast({
        title: "Error",
        description: "Error al crear la cuenta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('galeria_privada_session');
    setCurrentUser(null);
    setIsLoggedIn(false);
    
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  };

  if (isLoggedIn && currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Mi Galería Privada</h1>
              <p className="text-gray-600">Bienvenido, {currentUser.username}</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Cerrar Sesión
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Subir Archivos
                </CardTitle>
                <CardDescription>
                  Sube fotos, videos y GIFs a tu galería
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Seleccionar Archivos
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Mis Carpetas
                </CardTitle>
                <CardDescription>
                  Organiza tus archivos en carpetas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Ver Carpetas
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Compartir
                </CardTitle>
                <CardDescription>
                  Crea enlaces para compartir carpetas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Gestionar Enlaces
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Camera className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Galería Privada</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
              <DialogTrigger asChild>
                <Button variant="outline">Iniciar Sesión</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Iniciar Sesión</DialogTitle>
                  <DialogDescription>
                    Accede a tu galería privada
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-username">Usuario o Email</Label>
                    <Input
                      id="login-username"
                      type="text"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Iniciando...' : 'Entrar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
              <DialogTrigger asChild>
                <Button>Registrarse</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Cuenta</DialogTitle>
                  <DialogDescription>
                    Crea tu espacio personal para fotos y videos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-username">Nombre de Usuario</Label>
                    <Input
                      id="register-username"
                      type="text"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-confirm">Confirmar Contraseña</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creando...' : 'Crear Cuenta'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
            Tu Galería Personal
            <span className="block text-blue-600">Privada y Segura</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Almacena, organiza y comparte tus fotos, videos y archivos multimedia 
            de forma privada. Accede desde cualquier dispositivo.
          </p>
          <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
            <DialogTrigger asChild>
              <Button size="lg" className="text-lg px-8 py-4">
                Comenzar Gratis
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Privacidad Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Cada usuario tiene su espacio completamente aislado y privado
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <FolderOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Organización</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Crea carpetas y subcarpetas para mantener todo ordenado
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Share2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Compartir Fácil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Genera enlaces seguros para compartir carpetas específicas
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Acceso Universal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Accede desde cualquier dispositivo, en cualquier momento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            ¿Listo para empezar?
          </h3>
          <p className="text-gray-600 mb-6">
            Crea tu cuenta gratuita y comienza a organizar tus recuerdos
          </p>
          <div className="flex justify-center gap-4">
            <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
              <DialogTrigger asChild>
                <Button size="lg">Crear Cuenta</Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg">Ya tengo cuenta</Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GaleriaPrivada;
