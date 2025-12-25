import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useHeader } from '../../../context/HeaderContext';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import FormInput from '../../../components/FormInput/FormInput';
import Button from '../../../components/Button/Button';
import './ProfileScreen.css';

const ProfileScreen = () => {
  const { user } = useAuth();
  const { setHeaderTitle, setHeaderSubtitle } = useHeader();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  useEffect(() => {
    setHeaderTitle('Profile');
    setHeaderSubtitle('Manage your account information');
    return () => {
      setHeaderTitle(null);
      setHeaderSubtitle(null);
    };
  }, [setHeaderTitle, setHeaderSubtitle]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement update profile API call
    setTimeout(() => {
      setLoading(false);
      alert('Profile updated successfully!');
    }, 1000);
  };

  return (
    <div className="space-y-4">

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            icon={<User size={18} />}
          />

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            icon={<Mail size={18} />}
          />

          <FormInput
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            icon={<Phone size={18} />}
          />

          <FormInput
            label="Address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            icon={<MapPin size={18} />}
          />

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
            >
              Update Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileScreen;
