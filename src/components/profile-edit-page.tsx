import React, { useEffect, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { toast } from 'react-hot-toast'

const ProfileEditPage: React.FC = () => {
  const supabase = useSupabase()
  const [profile, setProfile] = React.useState<UserProfile | null>(null)

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile')
      }
    }

    fetchProfile()
  }, [supabase])

  const debouncedUpdate = useCallback(
    async (field: keyof UserProfile, value: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Special handling for email updates
        if (field === 'email') {
          const { error: emailError } = await supabase.auth.updateUser({
            email: value,
          })
          if (emailError) throw emailError
        }

        const { error } = await supabase
          .from('users')
          .update({ [field]: value })
          .eq('id', user.id)

        if (error) throw error

        // Show success message only for immediate feedback fields
        if (['phone', 'preferred_communication'].includes(field)) {
          toast.success(`${field.replace('_', ' ')} updated successfully`)
        }
      } catch (error) {
        console.error(`Error updating ${field}:`, error)
        toast.error(`Failed to update ${field.replace('_', ' ')}`)
      }
    },
    [supabase]
  )

  return (
    <div>
      {/* Render your component content here */}
    </div>
  )
}

export default ProfileEditPage 