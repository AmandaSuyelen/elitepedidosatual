import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  DollarSign, 
  Clock,
  User,
  Package,
  Save,
  X,
  Minus,
  AlertCircle,
  Calculator,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { RestaurantTable, TableSale, TableSaleItem, TableCartItem } from '../../types/table-sales';

interface TableSalesPanelProps {
  storeId: 1 | 2;
  operatorName?: string;
}

const TableSalesPanel: React.FC<TableSalesPanelProps> = ({ storeId, operatorName }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [cartItems, setCartItems] = useState<TableCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerCount, setCustomerCount] = useState(1);
  const [paymentType, setPaymentType] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'voucher' | 'misto'>('dinheiro');
  const [changeAmount, setChangeAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  // Check Supabase configuration
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const isConfigured = supabaseUrl && supabaseKey && 
                        supabaseUrl !== 'your_supabase_url_here' && 
                        supabaseKey !== 'your_supabase_anon_key_here' &&
                        !supabaseUrl.includes('placeholder');
    
    setSupabaseConfigured(isConfigured);
  }, []);

  const tableName = storeId === 1 ? 'store1_tables' : 'store2_tables';
  const salesTableName = storeId === 1 ? 'store1_table_sales' : 'store2_table_sales';
  const itemsTableName = storeId === 1 ? 'store1_table_sale_items' : 'store2_table_sale_items';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseConfigured) {
        console.warn(`⚠️ Supabase não configurado - usando dados de demonstração para Loja ${storeId}`);
        
        // Dados de demonstração
        const demoTables: RestaurantTable[] = [
          {
            id: 'demo-table-1',
            number: 1,
            name: `Mesa 1 - Loja ${storeId}`,
            capacity: 4,
            status: 'livre',
            location: 'Área principal',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'demo-table-2',
            number: 2,
            name: `Mesa 2 - Loja ${storeId}`,
            capacity: 2,
            status: 'livre',
            location: 'Área principal',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        setTables(demoTables);
        setLoading(false);
        return;
      }

      console.log(`🔄 Carregando mesas da Loja ${storeId}...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          current_sale:${salesTableName}(*)
        `)
        .eq('is_active', true)
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

  const openSale = async (table: RestaurantTable) => {
    try {
      if (!supabaseConfigured) {
        alert('Funcionalidade não disponível - Supabase não configurado');
        return;
      }

      setSaving(true);
      
      const { data: sale, error } = await supabase
        .from(salesTableName)
        .insert([{
          table_id: table.id,
          operator_name: operatorName || 'Operador',
          customer_name: customerName || 'Cliente',
          customer_count: customerCount,
          subtotal: 0,
          discount_amount: 0,
          total_amount: 0,
          change_amount: 0,
          status: 'aberta',
          notes: notes,
          opened_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Atualizar mesa com a venda atual
      await supabase
        .from(tableName)
        .update({
          status: 'ocupada',
          current_sale_id: sale.id
        })
        .eq('id', table.id);

      await fetchTables();
      setShowSaleModal(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao abrir venda:', err);
      alert('Erro ao abrir venda');
    } finally {
      setSaving(false);
    }
  };

  const closeSale = async (table: RestaurantTable) => {
    if (!table.current_sale) return;

    try {
      setSaving(true);

      // Fechar venda
      await supabase
        .from(salesTableName)
        .update({
          status: 'fechada',
          payment_type: paymentType,
          change_amount: changeAmount,
          closed_at: new Date().toISOString()
        })
        .eq('id', table.current_sale.id);

      // Liberar mesa
      await supabase
        .from(tableName)
        .update({
          status: 'livre',
          current_sale_id: null
        })
        .eq('id', table.id);

      await fetchTables();
      setShowSaleModal(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao fechar venda:', err);
      alert('Erro ao fechar venda');
    } finally {
      setSaving(false);
    }
  };

  const addItemToSale = async (saleId: string, item: TableCartItem) => {
    try {
      const { error } = await supabase
        .from(itemsTableName)
        .insert([{
          sale_id: saleId,
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: item.quantity,
          weight_kg: item.weight,
          unit_price: item.unit_price,
          price_per_gram: item.price_per_gram,
          discount_amount: 0,
          subtotal: item.subtotal,
          notes: item.notes
        }]);

      if (error) throw error;

      // Atualizar totais da venda
      const newSubtotal = cartItems.reduce((sum, cartItem) => sum + cartItem.subtotal, 0);
      
      await supabase
        .from(salesTableName)
        .update({
          subtotal: newSubtotal,
          total_amount: newSubtotal
        })
        .eq('id', saleId);

      await fetchTables();
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      throw err;
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerCount(1);
    setPaymentType('dinheiro');
    setChangeAmount(0);
    setNotes('');
    setCartItems([]);
    setSelectedTable(null);
  };

  const handleOpenSaleModal = (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowSaleModal(true);
    
    if (table.current_sale) {
      setCustomerName(table.current_sale.customer_name || '');
      setCustomerCount(table.current_sale.customer_count || 1);
      setNotes(table.current_sale.notes || '');
    }
  };

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.number.toString().includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre':
        return 'bg-green-100 text-green-800';
      case 'ocupada':
        return 'bg-red-100 text-red-800';
      case 'aguardando_conta':
        return 'bg-yellow-100 text-yellow-800';
      case 'limpeza':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      {/* Supabase Configuration Warning */}
      {!supabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-full p-2">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Modo Demonstração - Loja {storeId}</h3>
              <p className="text-yellow-700 text-sm">
                Supabase não configurado. Funcionalidades limitadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            Vendas de Mesas - Loja {storeId}
          </h2>
          <p className="text-gray-600">Gerencie vendas presenciais por mesa</p>
        </div>
        <button
          onClick={fetchTables}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar mesas..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTables.map((table) => (
          <div
            key={table.id}
            className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 rounded-full p-2">
                    <Users size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{table.name}</h3>
                    <p className="text-sm text-gray-600">Mesa {table.number}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                  {getStatusLabel(table.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User size={14} />
                  <span>Capacidade: {table.capacity} pessoas</span>
                </div>
                {table.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package size={14} />
                    <span>{table.location}</span>
                  </div>
                )}
              </div>

              {table.current_sale && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-green-600" />
                    <span className="font-medium text-gray-800">Venda Ativa</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-medium">{table.current_sale.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold text-green-600">
                        {formatPrice(table.current_sale.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aberta:</span>
                      <span className="text-gray-500">
                        {new Date(table.current_sale.opened_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {table.status === 'livre' ? (
                  <button
                    onClick={() => handleOpenSaleModal(table)}
                    disabled={!supabaseConfigured}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Abrir Mesa
                  </button>
                ) : table.status === 'ocupada' ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleOpenSaleModal(table)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 size={16} />
                      Gerenciar Venda
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTable(table);
                        setPaymentType('dinheiro');
                        setChangeAmount(0);
                        setShowSaleModal(true);
                      }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <DollarSign size={16} />
                      Fechar Conta
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      // Liberar mesa
                      if (supabaseConfigured) {
                        supabase
                          .from(tableName)
                          .update({ status: 'livre' })
                          .eq('id', table.id)
                          .then(() => fetchTables());
                      }
                    }}
                    disabled={!supabaseConfigured}
                    className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Liberar Mesa
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'Nenhuma mesa encontrada' : `Nenhuma mesa cadastrada na Loja ${storeId}`}
          </p>
        </div>
      )}

      {/* Sale Modal - ALTURA CORRIGIDA */}
      {showSaleModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header - Fixo */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Calculator size={24} className="text-indigo-600" />
                  {selectedTable.current_sale ? 'Gerenciar Venda' : 'Abrir Mesa'} - {selectedTable.name}
                </h2>
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content - Scrollável */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Informações da Mesa */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="font-medium text-indigo-800 mb-2">Informações da Mesa</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-indigo-600">Número:</span>
                      <span className="ml-2 font-medium">{selectedTable.number}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600">Capacidade:</span>
                      <span className="ml-2 font-medium">{selectedTable.capacity} pessoas</span>
                    </div>
                    <div>
                      <span className="text-indigo-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTable.status)}`}>
                        {getStatusLabel(selectedTable.status)}
                      </span>
                    </div>
                    {selectedTable.location && (
                      <div>
                        <span className="text-indigo-600">Local:</span>
                        <span className="ml-2 font-medium">{selectedTable.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados do Cliente */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-800">Dados do Cliente</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Cliente
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Nome do cliente"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Pessoas
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedTable.capacity}
                        value={customerCount}
                        onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Forma de Pagamento (apenas para fechar conta) */}
                {selectedTable.current_sale && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-800">Pagamento</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Forma de Pagamento
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as any)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">PIX</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="voucher">Voucher</option>
                        <option value="misto">Pagamento Misto</option>
                      </select>
                    </div>

                    {paymentType === 'dinheiro' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Troco para quanto?
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={changeAmount}
                          onChange={(e) => setChangeAmount(parseFloat(e.target.value) || 0)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Valor para troco"
                        />
                      </div>
                    )}

                    {/* Resumo da Venda */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">Resumo da Venda</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-600">Subtotal:</span>
                          <span className="font-medium">{formatPrice(selectedTable.current_sale.subtotal)}</span>
                        </div>
                        {selectedTable.current_sale.discount_amount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-green-600">Desconto:</span>
                            <span className="font-medium text-red-600">-{formatPrice(selectedTable.current_sale.discount_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-green-200">
                          <span className="text-green-800">Total:</span>
                          <span className="text-green-800">{formatPrice(selectedTable.current_sale.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Observações sobre a mesa ou venda..."
                  />
                </div>
              </div>
            </div>

            {/* Footer - Fixo na parte inferior */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaleModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                
                {selectedTable.current_sale ? (
                  <button
                    onClick={() => closeSale(selectedTable)}
                    disabled={saving || !supabaseConfigured}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Fechar Conta
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => openSale(selectedTable)}
                    disabled={saving || !customerName.trim() || !supabaseConfigured}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Abrir Mesa
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {!supabaseConfigured && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-red-600">
                    ⚠️ Funcionalidade não disponível - Supabase não configurado
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSalesPanel;