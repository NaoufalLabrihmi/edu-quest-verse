import { supabase } from '@/integrations/supabase/client';
// import type { Database } from '@/integrations/supabase/types';

// Category
export async function getCategories() {
  const { data, error } = await supabase
    .from<any, any>('forum_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

// Posts
export async function getPosts({
  categoryId,
  search,
  sort = 'recent',
  onlySaved = false,
  userId,
}: {
  categoryId?: string;
  search?: string;
  sort?: 'recent' | 'popular' | 'unanswered';
  onlySaved?: boolean;
  userId?: string;
}) {
  let selectString = `
    *,
    author:profiles(id, username, role),
    category:forum_categories(id, name),
    likes:forum_likes!forum_likes_post_id_fkey(id, user_id),
    comments:forum_comments(id)
  `;

  let query = supabase
    .from<any, any>('forum_posts')
    .select(selectString);

  if (categoryId) query = query.eq('category_id', categoryId);
  if (search) query = query.ilike('title', `%${search}%`);
  if (sort === 'unanswered') query = query.is('comments', null);
  if (onlySaved && userId) query = query.contains('likes', [{ user_id: userId }]);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addPost({
  title,
  content,
  categoryId,
  authorId,
}: {
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
}) {
  const { data, error } = await supabase
    .from<any, any>('forum_posts')
    .insert({
      title,
      content,
      category_id: categoryId,
      author_id: authorId,
      solved: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function likePost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from<any, any>('forum_likes')
    .insert({ post_id: postId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from<any, any>('forum_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getPostDetail(postId: string) {
  const { data, error } = await supabase
    .from<any, any>('forum_posts')
    .select(`
      *,
      author:profiles(id, username, role),
      category:forum_categories(id, name),
      likes:forum_likes!forum_likes_post_id_fkey(id, user_id),
      comments:forum_comments(id, author_id, content, created_at, author:profiles(id, username, role))
    `)
    .eq('id', postId)
    .single();
  if (error) throw error;
  return data;
}

export async function addComment({
  postId,
  authorId,
  content,
}: {
  postId: string;
  authorId: string;
  content: string;
}) {
  const { data, error } = await supabase
    .from<any, any>('forum_comments')
    .insert({ post_id: postId, author_id: authorId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markPostSolved(postId: string, solved: boolean) {
  const { data, error } = await supabase
    .from<any, any>('forum_posts')
    .update({ solved })
    .eq('id', postId)
    .select()
    .single();
  if (error) throw error;
  return data;
} 