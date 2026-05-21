import { useAuthUser, useSessionQuery } from '@/features/auth/auth.hooks';

export {
  useAuthUser,
  useLoginMutation,
  useLogoutMutation,
  useSessionQuery,
} from '@/features/auth/auth.hooks';

export function useCurrentUser() {
  return useSessionQuery();
}

export function useUser() {
  return useAuthUser();
}
