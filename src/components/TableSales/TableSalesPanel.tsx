import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RestaurantTable, TableSale, TableSaleItem, TableCartItem } from '../../types/table-sales';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  ShoppingCart, 
  Calculator,
  DollarSign,
  Package,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface TableSalesPanelProps {
  storeId: number;
  operatorName?: string;
}

const TableSalesPanel: React.FC<TableSalesPanelProps> = ({ storeId, operatorName }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
  const salesTableName = storeId === 1 ? 'store1_table_sales' : 'store2_table_sales';

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 Carregando mesas da Loja ${storeId}...`);

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          current_sale:${salesTableName}(*)
        `)
        .order('number');

      if (error) throw error;

      setTables(data || []);
      console.log(`✅ ${data?.length || 0} mesas carregadas da Loja ${storeId}`);
    } catch (err) {
      console.error(`❌ Erro ao carregar mesas da Loja ${storeId}:`, err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas');
    } finally {
      setLoading(false);
    }
  };

  const createTable = async (tableData: Omit<RestaurantTable, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log(`🚀 Criando mesa na Loja ${storeId}:`, tableData);

      const { data, error } = await supabase
        .from(tableName)
        .insert([tableData])
        .select()
        .single();

      if (error) throw error;

      setTables(prev => [...prev, data]);
      console.log(`✅ Mesa criada na Loja ${storeId}:`, data);
      return data;
    } catch (err) {
      console.error(`❌ Erro ao criar mesa na Loja ${storeId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar mesa');
    }
  };

  const updateTable = async (id: string, updates: Partial<RestaurantTable>) => {
    try {
      console.log(`✏️ Atualizando mesa da Loja ${storeId}:`, id, updates);

      const { data, error } = await supabase
        .from(tableName)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTables(prev => prev.map(t => t.id === id ? data : t));
      console.log(`✅ Mesa atualizada na Loja ${storeId}:`, data);
      return data;
    } catch (err) {
      console.error(`❌ Erro ao atualizar mesa da Loja ${storeId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar mesa');
    }
  };

  const deleteTable = async (id: string) => {
    try {
      console.log(`🗑️ Excluindo mesa da Loja ${storeId}:`, id);

      // Verificar se a mesa tem venda ativa
      const table = tables.find(t => t.id === id);
      if (table?.current_sale_id) {
        throw new Error('Não é possível excluir uma mesa com venda ativa. Finalize a venda primeiro.');
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTables(prev => prev.filter(t => t.id !== id));
      console.log(`✅ Mesa excluída da Loja ${storeId}`);
    } catch (err) {
      console.error(`❌ Erro ao excluir mesa da Loja ${storeId}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir mesa');
    }
  };

  const toggleTableActive = async (table: RestaurantTable) => {
    try {
      await updateTable(table.id, { is_active: !table.is_active });
    } catch (error) {
      console.error('Erro ao alterar status da mesa:', error);
      alert('Erro ao alterar status da mesa');
    }
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = searchTerm === '' || 
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.number.toString().includes(searchTerm) ||
      (table.location && table.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesActiveFilter = showInactive || table.is_active;
    
    return matchesSearch && matchesActiveFilter;
  });

  const handleCreate = () => {
    // Encontrar o próximo número disponível
    const existingNumbers = tables.map(t => t.number).sort((a, b) => a - b);
    let nextNumber = 1;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }

    setEditingTable({
      id: '',
      number: nextNumber,
      name: `Mesa ${nextNumber}`,
      capacity: 4,
      status: 'livre',
      current_sale_id: null,
      location: '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingTable) return;

    if (!editingTable.name.trim() || editingTable.number <= 0) {
      alert('Nome e número da mesa são obrigatórios');
      return;
    }

    // Verificar se o número já existe
    const existingTable = tables.find(t => 
      t.number === editingTable.number && t.id !== editingTable.id
    );
    if (existingTable) {
      alert('Número da mesa já existe. Use um número diferente.');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const { id, created_at, updated_at, current_sale, ...tableData } = editingTable;
        await createTable(tableData);
      } else {
        const { current_sale, ...tableData } = editingTable;
        await updateTable(editingTable.id, tableData);
      }
      
      setEditingTable(null);
      setIsCreating(false);
      
      // Mostrar feedback de sucesso
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Mesa ${isCreating ? 'criada' : 'atualizada'} com sucesso!
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar mesa:', error);
      alert(`Erro ao salvar mesa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a mesa "${name}"?`)) {
      try {
        await deleteTable(id);
        
        // Mostrar feedback de sucesso
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
        successMessage.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Mesa excluída com sucesso!
        `;
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
      } catch (error) {
        console.error('Erro ao excluir mesa:', error);
        alert(`Erro ao excluir mesa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ocupada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'aguardando_conta':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'limpeza':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'livre':
        return 'Livre';
      case 'ocupada':
        return 'Ocupada';
      case 'aguardando_conta':
        return 'Aguardando Conta';
      case 'limpeza':
        return 'Limpeza';
      default:
        return status;
    }
  };

  useEffect(() => {
    fetchTables();
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando mesas da Loja {storeId}...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            Gerenciar Mesas - Loja {storeId}
          </h2>
          <p className="text-gray-600">Configure e gerencie as mesas da loja</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Mesa
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar mesas por número, nome ou localização..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Mostrar mesas inativas
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTables.map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all hover:shadow-md ${
              !table.is_active ? 'opacity-60' : ''
            } ${getStatusColor(table.status)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-full p-2">
                  <Users size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">
                    Mesa {table.number}
                  </h3>
                  <p className="text-sm text-gray-600">{table.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTable(table)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Editar mesa"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(table.id, table.name)}
                  disabled={table.current_sale_id !== null}
                  className={`p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors ${
                    table.current_sale_id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={table.current_sale_id ? 'Não é possível excluir mesa com venda ativa' : 'Excluir mesa'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Capacidade:</span>
                <span className="font-medium">{table.capacity} pessoas</span>
              </div>

              {table.location && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Localização:</span>
                  <span className="font-medium text-sm">{table.location}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(table.status)}`}>
                  {getStatusLabel(table.status)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ativa:</span>
                <button
                  onClick={() => toggleTableActive(table)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    table.is_active
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {table.is_active ? (
                    <>
                      <Eye size={12} />
                      Ativa
                    </>
                  ) : (
                    <>
                      <EyeOff size={12} />
                      Inativa
                    </>
                  )}
                </button>
              </div>

              {table.current_sale_id && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      Venda Ativa
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Esta mesa possui uma venda em andamento
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Nenhuma mesa encontrada
          </h3>
          <p className="text-gray-500">
            {searchTerm || !showInactive 
              ? 'Tente ajustar os filtros de busca'
              : `Nenhuma mesa cadastrada na Loja ${storeId}`
            }
          </p>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editingTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {isCreating ? `Nova Mesa - Loja ${storeId}` : 'Editar Mesa'}
                </h2>
                <button
                  onClick={() => {
                    setEditingTable(null);
                    setIsCreating(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Número da Mesa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Mesa *
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingTable.number}
                  onChange={(e) => setEditingTable({
                    ...editingTable,
                    number: parseInt(e.target.value) || 1
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: 1"
                />
              </div>

              {/* Nome da Mesa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Mesa *
                </label>
                <input
                  type="text"
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({
                    ...editingTable,
                    name: e.target.value
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Mesa 1"
                />
              </div>

              {/* Capacidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidade (pessoas)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({
                    ...editingTable,
                    capacity: parseInt(e.target.value) || 4
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="4"
                />
              </div>

              {/* Localização */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização (opcional)
                </label>
                <input
                  type="text"
                  value={editingTable.location || ''}
                  onChange={(e) => setEditingTable({
                    ...editingTable,
                    location: e.target.value
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Área externa, Salão principal"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Inicial
                </label>
                <select
                  value={editingTable.status}
                  onChange={(e) => setEditingTable({
                    ...editingTable,
                    status: e.target.value as any
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="livre">Livre</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="aguardando_conta">Aguardando Conta</option>
                  <option value="limpeza">Limpeza</option>
                </select>
              </div>

              {/* Mesa Ativa */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingTable.is_active}
                    onChange={(e) => setEditingTable({
                      ...editingTable,
                      is_active: e.target.checked
                    })}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Mesa ativa (disponível para uso)
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingTable(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingTable.name.trim() || editingTable.number <= 0}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {isCreating ? 'Criar Mesa' : 'Salvar Alterações'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre Mesas */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 mb-2">ℹ️ Informações sobre Mesas</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• As mesas são salvas na tabela <code>{tableName}</code></li>
              <li>• Cada mesa pode ter uma venda ativa associada</li>
              <li>• Mesas inativas não aparecem no sistema de vendas</li>
              <li>• Não é possível excluir mesas com vendas ativas</li>
              <li>• O status da mesa é atualizado automaticamente durante as vendas</li>
              <li>• A capacidade ajuda a organizar o atendimento</li>
              <li>• A localização facilita a identificação das mesas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Estatísticas das Mesas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Estatísticas das Mesas - Loja {storeId}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {tables.filter(t => t.is_active).length}
            </p>
            <p className="text-gray-600">Mesas Ativas</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {tables.filter(t => t.status === 'livre' && t.is_active).length}
            </p>
            <p className="text-gray-600">Mesas Livres</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {tables.filter(t => t.status === 'ocupada').length}
            </p>
            <p className="text-gray-600">Mesas Ocupadas</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {tables.reduce((sum, t) => sum + (t.capacity || 0), 0)}
            </p>
            <p className="text-gray-600">Capacidade Total</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSalesPanel;