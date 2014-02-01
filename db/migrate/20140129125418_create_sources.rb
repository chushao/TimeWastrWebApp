class CreateSources < ActiveRecord::Migration
  def change 
    create_table :sources do |t|
      t.text :name
    end
  end
end
