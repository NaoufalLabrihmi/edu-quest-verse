import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table';

const initialProduct = { name: '', description: '', points: '', image: '' };

const ProductTable = () => {
  const [products, setProducts] = useState([]); // Replace with DB fetch
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openModal = (product = null) => {
    setEditProduct(product);
    setForm(product ? { ...product } : initialProduct);
    setError('');
    setSuccess('');
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditProduct(null);
    setForm(initialProduct);
    setError('');
    setSuccess('');
  };
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files && files[0]) {
      // For now, just store the file name; real upload logic later
      setForm((f) => ({ ...f, image: URL.createObjectURL(files[0]) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };
  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    // TODO: Add Supabase insert/update logic here
    setTimeout(() => {
      setLoading(false);
      setSuccess('Product saved!');
      setTimeout(closeModal, 1000);
    }, 800);
  };
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">Manage Products</h1>
        <Button onClick={() => openModal()} className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-2 rounded-lg shadow">Add Product</Button>
      </div>
      <div className="bg-gray-900/70 border border-gray-800 rounded-xl shadow-lg p-0">
        <Table>
          <TableCaption className="text-purple-200">All products available for students to buy with points.</TableCaption>
          <TableHeader>
            <TableRow className="bg-gray-900/80">
              <TableHead>Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Points Required</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-8">No products found.</TableCell>
              </TableRow>
            ) : (
              products.map((product, i) => (
                <TableRow key={i} className="hover:bg-purple-900/20 transition-all group">
                  <TableCell>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-14 h-14 object-cover rounded-lg border border-gray-700" />
                    ) : (
                      <span className="inline-block w-14 h-14 bg-gray-800 rounded-lg" />
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-white">{product.name}</TableCell>
                  <TableCell className="text-gray-300">{product.description}</TableCell>
                  <TableCell className="text-blue-200 font-bold">{product.points}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openModal(product)} className="text-blue-400">Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-400">Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-md w-full bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 border border-purple-700 rounded-2xl shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-200 mb-2">{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <p className="text-gray-400 mb-4">Fill in the product details below.</p>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-purple-100">Product Name</span>
              <Input name="name" value={form.name} onChange={handleChange} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-700" disabled={loading} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-purple-100">Description</span>
              <Input name="description" value={form.description} onChange={handleChange} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-700" disabled={loading} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-purple-100">Points Required</span>
              <Input name="points" type="number" value={form.points} onChange={handleChange} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-700" disabled={loading} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-purple-100">Image</span>
              <Input name="image" type="file" accept="image/*" onChange={handleChange} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-700" disabled={loading} />
              {form.image && <img src={form.image} alt="Preview" className="w-20 h-20 object-cover rounded-lg mt-2 border border-gray-700" />}
            </label>
            {error && <div className="text-red-400 text-sm font-medium mt-1">{error}</div>}
            {success && <div className="text-green-400 text-sm font-medium mt-1">{success}</div>}
          </div>
          <DialogFooter className="mt-6 flex gap-2 justify-end">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-2 rounded-lg shadow">
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductTable; 